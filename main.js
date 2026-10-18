"use strict";

const EPS = 1e-9;

const variablesCount = document.getElementById("variablesCount");
const equationsCount = document.getElementById("equationsCount");
const mode = document.getElementById("mode");

const inputGrid = document.getElementById("inputGrid");
const solveBtn = document.getElementById("solveBtn");
const clearBtn = document.getElementById("clearBtn");

const statusMessage = document.getElementById("statusMessage");
const stepCounter = document.getElementById("stepCounter");
const operationText = document.getElementById("operationText");
const matrixTable = document.getElementById("matrixTable");
const resultBox = document.getElementById("resultBox");

const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const autoBtn = document.getElementById("autoBtn");
const resetStepsBtn = document.getElementById("resetStepsBtn");

let n = 3;
let m = 3;
let steps = [];
let stepIndex = -1;
let autoTimer = null;

buildGrid();
renderEmptyMatrix();
renderExamples();

variablesCount.addEventListener("change", function () { buildGrid(); resetOutput(); });
equationsCount.addEventListener("change", function () { buildGrid(); resetOutput(); });
mode.addEventListener("change", function () { if (steps.length > 0) solve(); });
solveBtn.addEventListener("click", solve);
clearBtn.addEventListener("click", function () { buildGrid(true); resetOutput(); });
previousBtn.addEventListener("click", previousStep);
nextBtn.addEventListener("click", nextStep);
autoBtn.addEventListener("click", toggleAuto);
resetStepsBtn.addEventListener("click", resetSteps);

function buildGrid(clear) {
    const old = {};
    inputGrid.querySelectorAll("input").forEach(function (inp) {
        old[inp.dataset.r + "," + inp.dataset.c] = inp.value;
    });

    n = Number(variablesCount.value);
    m = Number(equationsCount.value);

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
                if (e.key === "Enter") {
                    e.preventDefault();
                    focusNext(r, c);
                }
            });

            td.appendChild(inp);
            tr.appendChild(td);
        }
        inputGrid.appendChild(tr);
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

function parseValue(text) {
    let s = text.trim().replace(/−/g, "-").replace(/\s+/g, "");
    if (s === "") return 0;

    if (s.includes("/")) {
        const parts = s.split("/");
        if (parts.length !== 2) return NaN;
        const a = Number(parts[0]);
        const b = Number(parts[1]);
        if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return NaN;
        return a / b;
    }

    const v = Number(s);
    return Number.isFinite(v) ? v : NaN;
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
            if (Number.isNaN(v)) {
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
    stopAuto();

    const matrix = readMatrix();

    if (!matrix) {
        alert("يوجد إدخال غير صالح (الخانات الحمراء). اكتب أرقاماً أو كسوراً مثل 1/2.");
        return;
    }

    const gaussJordan = mode.value === "RREF";

    steps = computeSteps(matrix, gaussJordan);
    stepIndex = 0;

    showCurrent();

    autoBtn.disabled = false;
    resetStepsBtn.disabled = false;

    renderResult(analyze(steps[steps.length - 1].matrix));
}

function computeSteps(original, gaussJordan) {
    const result = [];
    const matrix = cloneMatrix(original);
    const rows = matrix.length;
    const cols = matrix[0].length;

    result.push({
        title: "المصفوفة المبدئية (Augmented Matrix)",
        op: "-",
        matrix: cloneMatrix(matrix),
        row: -1, col: -1, pivotRow: -1
    });

    let r = 0;

    for (let col = 0; col < cols - 1 && r < rows; col++) {
        let p = -1;
        for (let i = r; i < rows; i++) {
            if (Math.abs(matrix[i][col]) > EPS) { p = i; break; }
        }

        if (p === -1) {
            result.push({
                title: "العمود " + getVariableName(col) + " كله أصفار من هذا الصف لأسفل، لذلك نتخطاه.",
                op: "لا يوجد عملية",
                matrix: cloneMatrix(matrix),
                row: -1, col: col, pivotRow: -1
            });
            continue;
        }

        if (p !== r) {
            const tmp = matrix[r];
            matrix[r] = matrix[p];
            matrix[p] = tmp;

            result.push({
                title: "تبديل صفين (العنصر الأول في العمود يساوي صفر).",
                op: "r" + (r + 1) + " <=> r" + (p + 1),
                matrix: cloneMatrix(matrix),
                row: r, col: col, pivotRow: r
            });
        }

        const pivot = matrix[r][col];
        if (Math.abs(pivot - 1) > EPS) {
            for (let c = 0; c < cols; c++) matrix[r][c] /= pivot;
            cleanMatrix(matrix);

            result.push({
                title: "ضرب صف في ثابت غير صفري لنحصل على Leading 1.",
                op: coefText(1 / pivot) + "r" + (r + 1) + " => r" + (r + 1),
                matrix: cloneMatrix(matrix),
                row: r, col: col, pivotRow: r
            });
        }

        const start = gaussJordan ? 0 : r + 1;

        for (let i = start; i < rows; i++) {
            if (i === r) continue;

            const factor = matrix[i][col];
            if (Math.abs(factor) < EPS) continue;

            for (let c = 0; c < cols; c++) {
                matrix[i][c] -= factor * matrix[r][c];
            }
            cleanMatrix(matrix);

            const where = i < r ? "أعلى" : "أسفل";

            result.push({
                title: "ضرب صف في ثابت غير صفري وجمعه على صف آخر لتصفير العنصر " + where + " الـ leading.",
                op: coefText(-factor) + "r" + (r + 1) + " + r" + (i + 1) + " => r" + (i + 1),
                matrix: cloneMatrix(matrix),
                row: i, col: col, pivotRow: r
            });
        }

        r++;
    }

    cleanMatrix(matrix);

    result.push({
        title: gaussJordan
            ? "وصلنا إلى Reduced Row Echelon Form (Gauss-Jordan)"
            : "وصلنا إلى Row Echelon Form (Gaussian)",
        op: "-",
        matrix: cloneMatrix(matrix),
        row: -1, col: -1, pivotRow: -1
    });

    return result;
}

function analyze(matrix) {
    const rows = matrix.length;
    const pivotCols = [];
    const pivotRows = [];

    for (let i = 0; i < rows; i++) {
        let lead = -1;
        for (let c = 0; c < n; c++) {
            if (Math.abs(matrix[i][c]) > EPS) { lead = c; break; }
        }

        if (lead === -1) {
            if (Math.abs(matrix[i][n]) > EPS) {
                return { type: "none" };
            }
            continue;
        }

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
        const v = new Array(size).fill(0);
        v[k + 1] = 1;
        x[c] = v;
    });

    for (let k = pivotRows.length - 1; k >= 0; k--) {
        const i = pivotRows[k];
        const p = pivotCols[k];
        const lead = matrix[i][p];

        const v = new Array(size).fill(0);
        v[0] = matrix[i][n];

        for (let j = p + 1; j < n; j++) {
            const a = matrix[i][j];
            if (Math.abs(a) < EPS) continue;
            for (let t = 0; t < size; t++) {
                v[t] -= a * x[j][t];
            }
        }

        for (let t = 0; t < size; t++) v[t] /= lead;
        x[p] = v;
    }

    if (free.length === 0) {
        return { type: "unique", x: x.map(function (v) { return v[0]; }) };
    }

    return { type: "infinite", x: x, free: free };
}

function expression(vec, free) {
    let text = "";

    if (Math.abs(vec[0]) > EPS) {
        text = formatNumber(vec[0]);
    }

    for (let k = 0; k < free.length; k++) {
        const a = vec[k + 1];
        if (Math.abs(a) < EPS) continue;

        const name = getVariableName(free[k]);
        const abs = Math.abs(a);
        const coef = Math.abs(abs - 1) < EPS ? "" : formatNumber(abs);

        if (text === "") {
            text = (a < 0 ? "−" : "") + coef + name;
        } else {
            text += (a < 0 ? " − " : " + ") + coef + name;
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

function showCurrent() {
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    const cur = steps[stepIndex];

    renderMatrix(cur.matrix, cur.row, cur.col, cur.pivotRow);

    stepCounter.textContent = "الخطوة " + (stepIndex + 1) + " من " + steps.length;
    statusMessage.textContent = cur.title;
    operationText.textContent = cur.op;

    previousBtn.disabled = stepIndex <= 0;
    nextBtn.disabled = stepIndex >= steps.length - 1;
}

function renderMatrix(matrix, hRow, hCol, pRow) {
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

            if (r === hRow) td.classList.add("highlight-row");
            if (c === hCol) td.classList.add("highlight-column");
            if (r === pRow && c === hCol) td.classList.add("pivot");

            tr.appendChild(td);
        }
        matrixTable.appendChild(tr);
    }
}

function renderEmptyMatrix() {
    matrixTable.innerHTML = "";
    const tr = document.createElement("tr");
    for (let c = 0; c <= n; c++) {
        const th = document.createElement("th");
        th.textContent = c < n ? getVariableName(c) : "B";
        tr.appendChild(th);
    }
    matrixTable.appendChild(tr);
}

function nextStep() {
    if (steps.length === 0) return;

    if (stepIndex < steps.length - 1) {
        stepIndex++;
        showCurrent();
    } else {
        stopAuto();
    }

    if (stepIndex >= steps.length - 1) stopAuto();
}

function previousStep() {
    if (steps.length === 0) return;
    if (stepIndex > 0) {
        stepIndex--;
        showCurrent();
    }
}

function toggleAuto() {
    if (autoTimer !== null) {
        stopAuto();
        return;
    }

    if (stepIndex >= steps.length - 1) {
        stepIndex = 0;
        showCurrent();
    }

    autoBtn.textContent = "إيقاف";
    autoTimer = setInterval(nextStep, 900);
}

function stopAuto() {
    if (autoTimer !== null) {
        clearInterval(autoTimer);
        autoTimer = null;
    }
    autoBtn.textContent = "تشغيل تلقائي";
}

function resetSteps() {
    stopAuto();
    if (steps.length > 0) {
        stepIndex = 0;
        showCurrent();
    }
}

function resetOutput() {
    stopAuto();

    steps = [];
    stepIndex = -1;

    previousBtn.disabled = true;
    nextBtn.disabled = true;
    autoBtn.disabled = true;
    resetStepsBtn.disabled = true;

    resultBox.className = "result-box hidden";
    resultBox.innerHTML = "";

    renderEmptyMatrix();

    statusMessage.textContent = "في انتظار إدخال المعاملات...";
    stepCounter.textContent = "-";
    operationText.textContent = "لم تبدأ الخوارزمية بعد.";
}

function cloneMatrix(matrix) {
    return matrix.map(function (row) { return row.slice(); });
}

function cleanMatrix(matrix) {
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            if (Math.abs(matrix[r][c]) < EPS) matrix[r][c] = 0;
        }
    }
}

function formatNumber(value) {
    if (Math.abs(value) < EPS) return "0";

    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 1e-9) return String(rounded);

    return Number(value.toFixed(3)).toString();
}

function getVariableName(index) {
    return "x" + (index + 1);
}

function formatFraction(value) {
    if (Math.abs(value - Math.round(value)) < 1e-9) {
        return String(Math.round(value));
    }

    const x = Math.abs(value);

    for (let d = 2; d <= 1000; d++) {
        const num = Math.round(x * d);

        if (Math.abs(x * d - num) < 1e-7) {
            return (value < 0 ? "-" : "") + num + "/" + d;
        }
    }

    return formatNumber(value);
}

function coefText(value) {
    const text = formatFraction(value);

    if (text.startsWith("-") || text.includes("/")) {
        return "(" + text + ")";
    }

    return text;
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
            answer: "x1 = 0.6 , x2 = 0.2"
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
            answer: "لا يوجد حل (ظهر صف [ 0 0 0 | -1 ])"
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