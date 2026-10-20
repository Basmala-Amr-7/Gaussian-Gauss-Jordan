"use strict";

const variablesCount = document.getElementById("variablesCount");
const equationsCount = document.getElementById("equationsCount");
const mode = document.getElementById("mode");

const inputGrid = document.getElementById("inputGrid");
const solveBtn = document.getElementById("solveBtn");
const clearBtn = document.getElementById("clearBtn");

const statusMessage = document.getElementById("statusMessage");
const matrixTable = document.getElementById("matrixTable");
const stepsCard = document.getElementById("stepsCard");
const stepsGrid = document.getElementById("stepsGrid");
const stepsSection = document.getElementById("stepsSection");
const toggleStepsBtn = document.getElementById("toggleStepsBtn");
const resultBox = document.getElementById("resultBox");

let n = 3;
let m = 3;
let steps = [];

buildGrid();
renderEmptyMatrix();
renderExamples();
wireTryButtons();

variablesCount.addEventListener("change", function () { buildGrid(); resetOutput(); });
equationsCount.addEventListener("change", function () { buildGrid(); resetOutput(); });
mode.addEventListener("change", function () { if (steps.length > 0) solve(); });
solveBtn.addEventListener("click", solve);
toggleStepsBtn.addEventListener("click", toggleSteps);
clearBtn.addEventListener("click", function () { buildGrid(true); resetOutput(); });

function buildGrid(clear) {
    const old = {};
    inputGrid.querySelectorAll("input").forEach(function (inp) {
        old[inp.dataset.r + "," + inp.dataset.c] = inp.value;
    });

    n = Number(variablesCount.value);
    m = Number(equationsCount.value);

    inputGrid.classList.toggle("dense", n > 10);

    inputGrid.innerHTML = "";

    const head = document.createElement("tr");
    head.appendChild(document.createElement("th"));
    for (let c = 0; c <= n; c++) {
        const th = document.createElement("th");
        th.textContent = c < n ? getVariableName(c) : "B";
        head.appendChild(th);
    }
    inputGrid.appendChild(head);

    for (let r = 0; r < m; r++) {
        const tr = document.createElement("tr");

        const label = document.createElement("th");
        label.textContent = "Eq " + (r + 1);
        tr.appendChild(label);

        for (let c = 0; c <= n; c++) {
            const td = document.createElement("td");
            const inp = document.createElement("input");
            inp.type = "text";
            inp.inputMode = "decimal";
            inp.placeholder = "0";
            inp.autocomplete = "off";
            inp.dataset.r = r;
            inp.dataset.c = c;

            const key = r + "," + c;
            if (!clear && old[key] !== undefined) {
                inp.value = old[key];
            }

            inp.addEventListener("keydown", function (e) {
                handleKey(e, r, c);
            });

            td.appendChild(inp);
            tr.appendChild(td);
        }
        inputGrid.appendChild(tr);
    }
}

function handleKey(e, r, c) {
    const inp = e.target;

    if (e.key === "Enter") {
        e.preventDefault();
        focusNext(r, c);
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        focusCell(r + 1, c);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusCell(r - 1, c);
    } else if (e.key === "ArrowRight" && inp.selectionEnd === inp.value.length) {
        e.preventDefault();
        focusCell(r, c + 1);
    } else if (e.key === "ArrowLeft" && inp.selectionStart === 0) {
        e.preventDefault();
        focusCell(r, c - 1);
    }
}

function focusCell(r, c) {
    if (r < 0 || r >= m || c < 0 || c > n) return;

    const target = inputGrid.querySelector(
        'input[data-r="' + r + '"][data-c="' + c + '"]'
    );

    if (target) {
        target.focus();
        target.select();
    }
}

function focusNext(r, c) {
    let nr = r;
    let nc = c + 1;
    if (nc > n) {
        nc = 0;
        nr = r + 1;
    }
    if (nr >= m) {
        solve();
        return;
    }
    const next = inputGrid.querySelector(
        'input[data-r="' + nr + '"][data-c="' + nc + '"]'
    );
    if (next) {
        next.focus();
        next.select();
    }
}

function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    while (b !== 0n) {
        const t = a % b;
        a = b;
        b = t;
    }

    return a;
}

function makeFrac(num, den) {
    if (den < 0n) {
        num = -num;
        den = -den;
    }

    const g = gcd(num, den) || 1n;

    return { n: num / g, d: den / g };
}

const ZERO = makeFrac(0n, 1n);
const ONE = makeFrac(1n, 1n);

function fadd(a, b) {
    return makeFrac(a.n * b.d + b.n * a.d, a.d * b.d);
}

function fsub(a, b) {
    return makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
}

function fmul(a, b) {
    return makeFrac(a.n * b.n, a.d * b.d);
}

function fdiv(a, b) {
    return makeFrac(a.n * b.d, a.d * b.n);
}

function fneg(a) {
    return { n: -a.n, d: a.d };
}

function isZero(a) {
    return a.n === 0n;
}

function isOne(a) {
    return a.n === 1n && a.d === 1n;
}

function parseDecimal(s) {
    const match = s.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);

    if (!match) return null;

    const intPart = match[2] || "";
    const fracPart = match[3] || "";

    if (intPart === "" && fracPart === "") return null;

    let num = BigInt((intPart || "0") + fracPart);
    const exp = (match[4] ? Number(match[4]) : 0) - fracPart.length;

    if (Math.abs(exp) > 60) return null;

    let den = 1n;

    if (exp >= 0) {
        num *= 10n ** BigInt(exp);
    } else {
        den = 10n ** BigInt(-exp);
    }

    if (match[1] === "-") num = -num;

    return makeFrac(num, den);
}

function parseValue(text) {
    const s = text.trim().replace(/−/g, "-").replace(/\s+/g, "");

    if (s === "") return ZERO;

    if (s.includes("/")) {
        const parts = s.split("/");
        if (parts.length !== 2) return null;

        const a = parseDecimal(parts[0]);
        const b = parseDecimal(parts[1]);

        if (a === null || b === null || isZero(b)) return null;

        return fdiv(a, b);
    }

    return parseDecimal(s);
}

function readMatrix() {
    const matrix = [];
    let ok = true;

    inputGrid.querySelectorAll("input").forEach(function (inp) {
        inp.classList.remove("invalid");
    });

    for (let r = 0; r < m; r++) {
        const row = [];
        for (let c = 0; c <= n; c++) {
            const inp = inputGrid.querySelector(
                'input[data-r="' + r + '"][data-c="' + c + '"]'
            );
            const v = parseValue(inp.value);
            if (v === null) {
                inp.classList.add("invalid");
                ok = false;
            }
            row.push(v);
        }
        matrix.push(row);
    }

    return ok ? matrix : null;
}

function solve() {
    const matrix = readMatrix();

    if (!matrix) {
        alert("يوجد إدخال غير صالح (الخانات الحمراء). اكتب أرقاماً أو كسوراً مثل 1/2.");
        return;
    }

    const gaussJordan = mode.value === "RREF";

    steps = computeSteps(matrix, gaussJordan);

    statusMessage.textContent = "تم بناء المصفوفة اضغط على زر اظهار الخطوات لترى الحل بالتفصيل.";

    stepsCard.classList.remove("hidden");

    renderMatrix(matrix);
    renderSteps(steps);
    toggleStepsBtn.disabled = false;
    renderResult(analyze(steps[steps.length - 1].matrix));
}

function findPivotRow(matrix, r, col) {
    const rows = matrix.length;

    for (let i = r; i < rows; i++) {
        if (isOne(matrix[i][col])) return i;
    }

    for (let i = r; i < rows; i++) {
        if (!isZero(matrix[i][col])) return i;
    }

    return -1;
}

function computeSteps(original, gaussJordan) {
    const result = [];
    const matrix = cloneMatrix(original);
    const rows = matrix.length;
    const cols = matrix[0].length;

    let r = 0;

    for (let col = 0; col < cols && r < rows; col++) {
        const p = findPivotRow(matrix, r, col);

        if (p === -1) continue;

        const colName = col < cols - 1 ? getVariableName(col) : "B";

        if (p !== r) {
            const oldTop = matrix[r][col];
            const newTop = matrix[p][col];

            const tmp = matrix[r];
            matrix[r] = matrix[p];
            matrix[p] = tmp;

            let title;
            if (isOne(newTop) && isZero(oldTop)) {
                title = "أول عنصر في عمود " + colName + " يساوي صفر، والصف " + (p + 1) +
                    " يبدأ بـ 1، فنبدّل الصفين ليصبح الـ Leading 1 مباشرة بدون ضرب.";
            } else if (isOne(newTop)) {
                title = "أول عنصر في عمود " + colName + " لا يساوي 1، والصف " + (p + 1) +
                    " يبدأ بـ 1، فنبدّل الصفين ليصبح الـ Leading 1 مباشرة بدون ضرب.";
            } else {
                title = "أول عنصر في عمود " + colName + " يساوي صفر، فنبدّل مع الصف " +
                    (p + 1) + " (أول صف غير صفري في هذا العمود).";
            }

            result.push({
                title: title,
                ops: [{
                    ar: "تبديل الصف " + (r + 1) + " مع الصف " + (p + 1),
                    f: "R" + (r + 1) + " ↔ R" + (p + 1)
                }],
                matrix: cloneMatrix(matrix),
                changed: [r, p],
                pivotRow: r,
                pivotCol: col
            });
        }

        const pivot = matrix[r][col];
        if (!isOne(pivot)) {
            matrix[r] = matrix[r].map(function (x) { return fdiv(x, pivot); });

            const k = coefText(fdiv(ONE, pivot));

            result.push({
                title: "نجعل أول عنصر في الصف " + (r + 1) + " يساوي 1 (Leading 1) بضرب الصف في مقلوب " +
                    formatFraction(pivot) + ".",
                ops: [{
                    ar: "اضرب الصف " + (r + 1) + " في " + k,
                    f: k + "R" + (r + 1) + " → R" + (r + 1)
                }],
                matrix: cloneMatrix(matrix),
                changed: [r],
                pivotRow: r,
                pivotCol: col
            });
        }

        const start = gaussJordan ? 0 : r + 1;
        const ops = [];
        const changed = [];

        for (let i = start; i < rows; i++) {
            if (i === r) continue;

            const factor = matrix[i][col];
            if (isZero(factor)) continue;

            const pivotRow = matrix[r];
            matrix[i] = matrix[i].map(function (x, c) {
                return fsub(x, fmul(factor, pivotRow[c]));
            });

            const k = coefText(fneg(factor));

            ops.push({
                ar: "أضف " + k + " × الصف " + (r + 1) + " إلى الصف " + (i + 1),
                f: k + "R" + (r + 1) + " + R" + (i + 1) + " → R" + (i + 1)
            });
            changed.push(i);
        }

        if (ops.length > 0) {
            result.push({
                title: gaussJordan
                    ? "نجعل باقي عناصر عمود " + colName + " أصفاراً (أسفل وأعلى الـ Leading 1)."
                    : "نجعل العناصر أسفل الـ Leading 1 في عمود " + colName + " أصفاراً.",
                ops: ops,
                matrix: cloneMatrix(matrix),
                changed: changed,
                pivotRow: r,
                pivotCol: col
            });
        }

        r++;
    }

    result.push({
        title: gaussJordan
            ? "وصلنا إلى Reduced Row Echelon Form (Gauss-Jordan)"
            : "وصلنا إلى Row Echelon Form (Gaussian)",
        ops: [],
        matrix: cloneMatrix(matrix),
        changed: [],
        pivotRow: -1,
        pivotCol: -1,
        final: true
    });

    return result;
}

function analyze(matrix) {
    const rows = matrix.length;
    const pivotCols = [];
    const pivotRows = [];

    for (let i = 0; i < rows; i++) {
        let lead = -1;
        for (let c = 0; c <= n; c++) {
            if (!isZero(matrix[i][c])) { lead = c; break; }
        }

        if (lead === -1) continue;

        if (lead === n) return { type: "none" };

        pivotRows.push(i);
        pivotCols.push(lead);
    }

    const free = [];
    for (let c = 0; c < n; c++) {
        if (!pivotCols.includes(c)) free.push(c);
    }

    const size = free.length + 1;
    const x = new Array(n).fill(null);

    free.forEach(function (c, k) {
        const v = new Array(size).fill(ZERO);
        v[k + 1] = ONE;
        x[c] = v;
    });

    for (let k = pivotRows.length - 1; k >= 0; k--) {
        const i = pivotRows[k];
        const p = pivotCols[k];
        const lead = matrix[i][p];

        const v = new Array(size).fill(ZERO);
        v[0] = matrix[i][n];

        for (let j = p + 1; j < n; j++) {
            const a = matrix[i][j];
            if (isZero(a)) continue;
            for (let t = 0; t < size; t++) {
                v[t] = fsub(v[t], fmul(a, x[j][t]));
            }
        }

        for (let t = 0; t < size; t++) v[t] = fdiv(v[t], lead);
        x[p] = v;
    }

    if (free.length === 0) {
        return { type: "unique", x: x.map(function (v) { return v[0]; }) };
    }

    return { type: "infinite", x: x, free: free };
}

function expression(vec, free) {
    let text = "";

    if (!isZero(vec[0])) {
        text = formatNumber(vec[0]);
    }

    for (let k = 0; k < free.length; k++) {
        const a = vec[k + 1];
        if (isZero(a)) continue;

        const name = getVariableName(free[k]);
        const negative = a.n < 0n;
        const abs = negative ? fneg(a) : a;
        const coef = isOne(abs) ? "" : (abs.d === 1n ? abs.n.toString() : "(" + formatFraction(abs) + ")");

        if (text === "") {
            text = (negative ? "−" : "") + coef + name;
        } else {
            text += (negative ? " − " : " + ") + coef + name;
        }
    }

    return text === "" ? "0" : text;
}

function renderResult(res) {
    resultBox.className = "result-box";
    resultBox.innerHTML = "";

    const title = document.createElement("h3");
    resultBox.appendChild(title);

    if (res.type === "none") {
        resultBox.classList.add("none");
        title.textContent = "لا يوجد حل (No Solution)";

        const p = document.createElement("p");
        p.textContent = "النظام غير متسق: ظهر صف على الشكل [ 0 0 … 0 | b ] حيث b لا تساوي صفر.";
        resultBox.appendChild(p);
        return;
    }

    const list = document.createElement("div");
    list.className = "solution-list";

    if (res.type === "unique") {
        resultBox.classList.add("unique");
        title.textContent = "يوجد حل وحيد (Unique Solution)";

        res.x.forEach(function (v, i) {
            const line = document.createElement("div");
            line.textContent = getVariableName(i) + " = " + formatNumber(v);
            list.appendChild(line);
        });
    } else {
        resultBox.classList.add("infinite");
        title.textContent = "يوجد عدد لا نهائي من الحلول (Infinitely Many Solutions)";

        const names = res.free.map(getVariableName).join(" , ");
        const note = document.createElement("p");
        note.textContent = "free variable : " + names;
        resultBox.appendChild(note);

        res.x.forEach(function (v, i) {
            const line = document.createElement("div");
            line.textContent = res.free.includes(i)
                ? getVariableName(i) + " = " + getVariableName(i) + "  (free variable)"
                : getVariableName(i) + " = " + expression(v, res.free);
            list.appendChild(line);
        });
    }

    resultBox.appendChild(list);
}

function renderMatrix(matrix) {
    matrixTable.innerHTML = "";
    if (!matrix) return;

    const head = document.createElement("tr");
    for (let c = 0; c < matrix[0].length; c++) {
        const th = document.createElement("th");
        th.textContent = c < n ? getVariableName(c) : "B";
        head.appendChild(th);
    }
    matrixTable.appendChild(head);

    for (let r = 0; r < matrix.length; r++) {
        const tr = document.createElement("tr");

        for (let c = 0; c < matrix[r].length; c++) {
            const td = document.createElement("td");
            td.textContent = formatNumber(matrix[r][c]);
            tr.appendChild(td);
        }
        matrixTable.appendChild(tr);
    }

    matrixTable.classList.toggle("dense", matrix[0].length > 10);
}

function renderSteps(list) {
    stepsGrid.innerHTML = "";

    list.forEach(function (step, index) {
        const card = document.createElement("div");
        card.className = "step-card" + (step.final ? " final" : "");

        const head = document.createElement("div");
        head.className = "step-head";

        const num = document.createElement("span");
        num.className = "step-num";
        num.textContent = step.final ? "✓" : String(index + 1);

        head.appendChild(num);

        if (step.title) {
            const title = document.createElement("span");
            title.className = "step-title";
            title.textContent = step.title;
            head.appendChild(title);
        }
        card.appendChild(head);

        if (step.ops.length > 0) {
            const opsBox = document.createElement("div");
            opsBox.className = "step-ops";

            step.ops.forEach(function (op) {
                const line = document.createElement("div");
                line.className = "op-line";

                const ar = document.createElement("span");
                ar.className = "op-ar";
                ar.textContent = op.ar;

                const f = document.createElement("span");
                f.className = "op-f";
                f.textContent = op.f;

                line.appendChild(ar);
                line.appendChild(f);
                opsBox.appendChild(line);
            });

            card.appendChild(opsBox);
        }

        const wrap = document.createElement("div");
        wrap.className = "step-matrix-wrap";
        wrap.appendChild(buildStepMatrix(step));
        card.appendChild(wrap);

        stepsGrid.appendChild(card);
    });
}

function buildStepMatrix(step) {
    const table = document.createElement("table");
    const width = step.matrix[0].length;
    table.className = "step-matrix" + (width > 7 ? " compact" : "") + (width > 12 ? " tiny" : "");

    step.matrix.forEach(function (row, r) {
        const tr = document.createElement("tr");

        row.forEach(function (value, c) {
            const td = document.createElement("td");
            td.textContent = formatNumber(value);

            if (step.changed.includes(r)) td.classList.add("changed");
            if (r === step.pivotRow && c === step.pivotCol) td.classList.add("pivot");

            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    return table;
}

function renderEmptyMatrix() {
    matrixTable.innerHTML = "";
    matrixTable.classList.toggle("dense", n > 9);
    const tr = document.createElement("tr");
    for (let c = 0; c <= n; c++) {
        const th = document.createElement("th");
        th.textContent = c < n ? getVariableName(c) : "B";
        tr.appendChild(th);
    }
    matrixTable.appendChild(tr);
}

function toggleSteps() {
    const hidden = stepsSection.classList.toggle("hidden");

    toggleStepsBtn.textContent = hidden ? "إظهار خطوات الحل" : "إخفاء خطوات الحل";
}

function hideSteps() {
    stepsSection.classList.add("hidden");
    toggleStepsBtn.textContent = "إظهار خطوات الحل";
}

function resetOutput() {
    steps = [];

    hideSteps();
    toggleStepsBtn.disabled = true;
    stepsCard.classList.add("hidden");

    stepsGrid.innerHTML = "";

    resultBox.className = "result-box hidden";
    resultBox.innerHTML = "";

    renderEmptyMatrix();

    statusMessage.textContent = "في انتظار إدخال المعاملات...";
}

function cloneMatrix(matrix) {
    return matrix.map(function (row) { return row.slice(); });
}

function formatNumber(value) {
    return formatFraction(value);
}

function getVariableName(index) {
    return "x" + (index + 1);
}

function formatFraction(value) {
    if (value.d === 1n) return value.n.toString();

    return value.n.toString() + "/" + value.d.toString();
}

function coefText(value) {
    const text = formatFraction(value);

    if (text.startsWith("-") || text.includes("/")) {
        return "(" + text + ")";
    }

    return text;
}

function tridiagonalSystem(size) {
    const rows = [];

    for (let i = 0; i < size; i++) {
        const row = new Array(size + 1).fill(0);
        row[i] = 2;
        if (i > 0) row[i - 1] = -1;
        if (i < size - 1) row[i + 1] = -1;
        row[size] = (i === 0 || i === size - 1) ? 1 : 0;
        rows.push(row);
    }

    return rows;
}

function getExamples() {
    return [
        {
            title: "مثال 1: نظام 3 × 3",
            type: "unique",
            matrix: [[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 2]],
            answer: "x1 = 1 , x2 = 2 , x3 = 3"
        },
        {
            title: "مثال 2: يحتاج تبديل صفوف",
            type: "unique",
            matrix: [[0, 2, 1, 5], [1, 1, 1, 6], [2, -1, 1, 6]],
            answer: "x1 = 2 , x2 = 1 , x3 = 3"
        },
        {
            title: "مثال 3: نظام 4 × 4",
            type: "unique",
            matrix: [[1, 1, 1, 1, 2], [2, -1, 0, 1, 3], [0, 1, -1, 2, -3], [1, 0, 2, 1, 5]],
            answer: "x1 = 1 , x2 = -1 , x3 = 2 , x4 = 0"
        },
        {
            title: "مثال 4: نظام 2 × 2 بحل كسري",
            type: "unique",
            matrix: [[1, 2, 1], [3, 1, 2]],
            answer: "x1 = 3/5 , x2 = 1/5"
        },
        {
            title: "مثال 5: عدد لا نهائي من الحلول",
            type: "infinite",
            matrix: [[1, 2, -1, 3], [2, 4, -2, 6], [1, 1, 1, 4]],
            answer: "x1 = 5 − 3x3 , x2 = -1 + 2x3 , x3 = x3 (Free Variable), leading لأنه مفيش في عموده."
        },
        {
            title: "مثال 6: لا يوجد حل",
            type: "none",
            matrix: [[1, 1, 1, 3], [2, 2, 2, 5], [1, -1, 0, 0]],
            answer: "لا يوجد حل (ظهر صف [ 0 0 0 | 1 ])"
        },
        {
            title: "مثال 7: معادلات أكثر من المجهولات (متسق)",
            type: "unique",
            matrix: [[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 2], [3, 1, 2, 11]],
            answer: "x1 = 1 , x2 = 2 , x3 = 3"
        },
        {
            title: "مثال 8: معادلات أكثر من المجهولات (غير متسق)",
            type: "none",
            matrix: [[1, 1, 2], [1, -1, 0], [2, 1, 4]],
            answer: "لا يوجد حل (ظهر صف [ 0 0 | 1 ])"
        },
        {
            title: "مثال 9: نظام متجانس (كل B = 0)",
            type: "infinite",
            matrix: [[1, 2, -1, 0], [2, 1, 1, 0], [1, -1, 2, 0]],
            answer: "x1 = −x3 , x2 = x3 , x3 = x3 (Free Variable)"
        },
        {
            title: "مثال 10: متغيران حران",
            type: "infinite",
            matrix: [[1, 1, 1, 1, 4], [1, -1, 1, -1, 0]],
            answer: "x1 = 2 − x3 , x2 = 2 − x4 , x3 = x3 (Free Variable) , x4 = x4 (Free Variable)"
        },
        {
            title: "مثال 11: نظام يحتوي على صف أصفار",
            type: "infinite",
            matrix: [[1, 1, 1, 3], [0, 0, 0, 0], [1, -1, 0, 0]],
            answer: "x1 = 3/2 − (1/2)x3 , x2 = 3/2 − (1/2)x3 , x3 = x3 (Free Variable)"
        },
        {
            title: "مثال 12: معادلة واحدة بمجهولين",
            type: "infinite",
            matrix: [[1, 1, 3]],
            answer: "x1 = 3 − x2 , x2 = x2 (Free Variable)"
        },
        {
            title: "مثال 13: معادلة واحدة بمجهول واحد",
            type: "unique",
            matrix: [[2, 6]],
            answer: "x1 = 3"
        },
        {
            title: "مثال 14: نظام 5 × 5",
            type: "unique",
            matrix: [[2, 1, 0, 0, 1, 9], [1, 3, 1, 0, 0, 10], [0, 1, 4, 1, 0, 18], [0, 0, 1, 5, 1, 28], [1, 0, 0, 1, 6, 35]],
            answer: "x1 = 1 , x2 = 2 , x3 = 3 , x4 = 4 , x5 = 5"
        },
        {
            title: "مثال 15: نظام 10 × 10",
            type: "unique",
            matrix: [
                [2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [-1, 2, -1, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, -1, 2, -1, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, -1, 2, -1, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, -1, 2, -1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, -1, 2, -1, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, -1, 2, -1, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, -1, 2, -1, 0, 0],
                [0, 0, 0, 0, 0, 0, 0, -1, 2, -1, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, -1, 2, 1]
            ],
            answer: "x1 = x2 = x3 = x4 = x5 = x6 = x7 = x8 = x9 = x10 = 1"
        },
        {
            title: "مثال 16: نظام 20 × 20 (أقصى حجم)",
            type: "unique",
            matrix: tridiagonalSystem(20),
            answer: "x1 = x2 = x3 = ... = x20 = 1"
        }
    ];
}

function equationText(row) {
    const count = row.length - 1;
    let text = "";

    for (let c = 0; c < count; c++) {
        const a = row[c];
        if (a === 0) continue;

        const abs = Math.abs(a);
        const coef = abs === 1 ? "" : String(abs);
        const term = coef + getVariableName(c);

        if (text === "") {
            text = (a < 0 ? "-" : "") + term;
        } else {
            text += (a < 0 ? " - " : " + ") + term;
        }
    }

    if (text === "") text = "0";

    return text + " = " + row[count];
}

function renderExamples() {
    const grid = document.getElementById("examplesGrid");
    const labels = {
        unique: "حل وحيد",
        infinite: "عدد لا نهائي من الحلول",
        none: "لا يوجد حل"
    };

    getExamples().forEach(function (example) {
        const card = document.createElement("div");
        card.className = "example-card";

        const head = document.createElement("div");
        head.className = "example-head";

        const title = document.createElement("h3");
        title.textContent = example.title;

        const badge = document.createElement("span");
        badge.className = "badge " + example.type;
        badge.textContent = labels[example.type];

        head.appendChild(title);
        head.appendChild(badge);

        const equationsBox = document.createElement("div");
        equationsBox.className = "example-equations";

        example.matrix.forEach(function (row) {
            const line = document.createElement("div");
            line.textContent = equationText(row);
            equationsBox.appendChild(line);
        });

        const answer = document.createElement("div");
        answer.className = "example-answer";

        const answerLabel = document.createElement("strong");
        answerLabel.textContent = "الحل: ";

        const answerText = document.createElement("span");
        answerText.textContent = example.answer;

        answer.appendChild(answerLabel);
        answer.appendChild(answerText);

        const button = document.createElement("button");
        button.className = "primary-btn";
        button.textContent = "جرّب المثال";
        button.addEventListener("click", function () {
            loadExample(example);
        });

        card.appendChild(head);
        card.appendChild(equationsBox);
        card.appendChild(answer);
        card.appendChild(button);

        grid.appendChild(card);
    });
}

function loadExample(example) {
    variablesCount.value = String(example.matrix[0].length - 1);
    equationsCount.value = String(example.matrix.length);

    buildGrid(true);
    resetOutput();

    example.matrix.forEach(function (row, r) {
        row.forEach(function (value, c) {
            const inp = inputGrid.querySelector(
                'input[data-r="' + r + '"][data-c="' + c + '"]'
            );
            inp.value = String(value);
        });
    });

    solve();

    document.querySelector(".steps-card").scrollIntoView({ behavior: "smooth" });
}

function wireTryButtons() {
    document.querySelectorAll(".try-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            loadExample({ matrix: JSON.parse(btn.dataset.matrix) });
        });
    });
}