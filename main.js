"use strict";

const variablesCount = document.getElementById("variablesCount");
const equationsCount = document.getElementById("equationsCount");
const mode = document.getElementById("mode");

const equationInput = document.getElementById("equationInput");
const addEquationBtn = document.getElementById("addEquationBtn");
const editLastBtn = document.getElementById("editLastBtn");
const buildBtn = document.getElementById("buildBtn");
const resetInputBtn = document.getElementById("resetInputBtn");

const equationCounter = document.getElementById("equationCounter");
const equationsList = document.getElementById("equationsList");

const statusMessage = document.getElementById("statusMessage");
const stepCounter = document.getElementById("stepCounter");
const operationText = document.getElementById("operationText");

const matrixTable = document.getElementById("matrixTable");

const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const autoBtn = document.getElementById("autoBtn");
const resetStepsBtn = document.getElementById("resetStepsBtn");

let n = 3;
let m = 3;

let equations = [];
let rawEquations = [];

let steps = [];
let stepIndex = -1;

let autoTimer = null;

updateCounter();

renderEmptyMatrix();

variablesCount.addEventListener("change", resetInput);

equationsCount.addEventListener("change", resetInput);

mode.addEventListener("change", function () {
    if (equations.length === m) {
        buildMatrix();
    }
});

addEquationBtn.addEventListener("click", addEquation);

equationInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addEquation();
    }
});

editLastBtn.addEventListener("click", editLast);

buildBtn.addEventListener("click", buildMatrix);

resetInputBtn.addEventListener("click", resetInput);

previousBtn.addEventListener("click", previousStep);

nextBtn.addEventListener("click", nextStep);

autoBtn.addEventListener("click", toggleAuto);

resetStepsBtn.addEventListener("click", resetSteps);

function addEquation() {
    n = Number(variablesCount.value);
    m = Number(equationsCount.value);

    if (equations.length >= m) {
        alert("تم إدخال كل المعادلات المطلوبة.");
        return;
    }

    const input = equationInput.value.trim();

    if (input === "") {
        alert("اكتب المعادلة أولاً.");
        equationInput.focus();
        return;
    }

    const result = parseEquation(input);

    if (!result.success) {
        alert("خطأ في المعادلة:\n\n" + result.error);
        equationInput.focus();
        equationInput.select();
        return;
    }

    equations.push(result.coefficients);
    rawEquations.push(input);

    renderEquations();

    equationInput.value = "";
    equationInput.focus();

    updateCounter();

    if (equations.length === m) {
        equationInput.disabled = true;
        addEquationBtn.disabled = true;
        buildBtn.disabled = false;

        statusMessage.textContent =
            "تم إدخال كل المعادلات. اضغط على «بناء المصفوفة».";
    }
}

function parseEquation(input) {
    const coefficients = new Array(n + 1).fill(0);

    if (!input.includes("=")) {
        return {
            success: false,
            error: "المعادلة يجب أن تحتوي على علامة =."
        };
    }

    const parts = input.split("=");

    if (parts.length !== 2) {
        return {
            success: false,
            error: "يجب أن تحتوي المعادلة على علامة = واحدة فقط."
        };
    }

    const leftSide = parts[0]
        .replace(/\s+/g, "")
        .replace(/−/g, "-");

    const rightSide = parts[1]
        .trim()
        .replace(/\s+/g, "");

    const rhs = Number(rightSide);

    if (!Number.isFinite(rhs)) {
        return {
            success: false,
            error: "الطرف الأيمن يجب أن يكون رقماً، مثل 10 أو -3.5."
        };
    }

    const normalized = leftSide.replace(/-/g, "+-");

    const terms = normalized
        .split("+")
        .filter(term => term !== "");

    if (terms.length === 0) {
        return {
            success: false,
            error: "لم يتم العثور على حدود في الطرف الأيسر."
        };
    }

    for (let term of terms) {
        term = term.replace(/\*/g, "");

        const match = term.match(
            /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)?([a-zA-Z](?:\d+)?)?$/
        );

        if (!match) {
            return {
                success: false,
                error: "حد غير مفهوم: " + term
            };
        }

        let coefficientText = match[1] || "";
        let variableName = match[2] || "";

        if (variableName === "") {
            const constant = Number(coefficientText);

            if (!Number.isFinite(constant)) {
                return {
                    success: false,
                    error: "رقم غير صالح: " + term
                };
            }

            coefficients[n] -= constant;
            continue;
        }

        let coefficient;

        if (
            coefficientText === "" ||
            coefficientText === "+"
        ) {
            coefficient = 1;
        } else if (coefficientText === "-") {
            coefficient = -1;
        } else {
            coefficient = Number(coefficientText);

            if (!Number.isFinite(coefficient)) {
                return {
                    success: false,
                    error: "المعامل غير صالح: " + term
                };
            }
        }

        const variableIndex = getVariableIndex(variableName);

        if (
            variableIndex < 0 ||
            variableIndex >= n
        ) {
            return {
                success: false,
                error:
                    "المتغير " +
                    variableName +
                    " غير موجود ضمن المجهولات."
            };
        }

        coefficients[variableIndex] += coefficient;
    }

    coefficients[n] += rhs;

    return {
        success: true,
        coefficients: coefficients
    };
}

function getVariableIndex(name) {
    const lower = name.toLowerCase();

    if (lower.length === 1) {
        const variables = "xyzw";
        return variables.indexOf(lower);
    }

    if (lower.startsWith("x")) {
        const number = Number(
            lower.substring(1)
        );

        if (
            Number.isInteger(number) &&
            number >= 1
        ) {
            return number - 1;
        }
    }

    return -1;
}

function renderEquations() {
    equationsList.innerHTML = "";

    if (rawEquations.length === 0) {
        equationsList.innerHTML = `
            <div class="empty-message">
                لم يتم إدخال أي معادلات بعد
            </div>
        `;

        return;
    }

    rawEquations.forEach(function (equation, index) {
        const item = document.createElement("div");

        item.className = "equation-item";

        item.innerHTML = `
            <span class="equation-number">
                ${index + 1}
            </span>

            <span class="equation-text">
                ${escapeHtml(equation)}
            </span>
        `;

        equationsList.appendChild(item);
    });
}

function editLast() {
    if (rawEquations.length === 0) {
        alert("لا توجد معادلة لتعديلها.");
        return;
    }

    const lastIndex = rawEquations.length - 1;

    equationInput.value = rawEquations[lastIndex];

    equations.pop();
    rawEquations.pop();

    equationInput.disabled = false;
    addEquationBtn.disabled = false;
    buildBtn.disabled = true;

    renderEquations();
    updateCounter();

    statusMessage.textContent =
        "يمكنك تعديل آخر معادلة وإدخالها مرة أخرى.";

    equationInput.focus();
}

function updateCounter() {
    equationCounter.textContent =
        equations.length +
        " / " +
        Number(equationsCount.value);
}

function buildMatrix() {
    stopAuto();

    n = Number(variablesCount.value);
    m = Number(equationsCount.value);

    if (equations.length !== m) {
        alert(
            "يجب إدخال " +
            m +
            " معادلات أولاً."
        );

        return;
    }

    const augmented = createAugmentedMatrix();

    const wantRref = mode.value === "RREF";

    steps = computeSteps(
        augmented,
        wantRref
    );

    stepIndex = 0;

    renderMatrix();

    showCurrent();

    previousBtn.disabled = true;
    nextBtn.disabled = steps.length <= 1;
    autoBtn.disabled = false;
    resetStepsBtn.disabled = false;

    statusMessage.textContent =
        "تم بناء المصفوفة. استخدم أزرار الخطوات.";
}

function createAugmentedMatrix() {
    const matrix = [];

    for (let i = 0; i < m; i++) {
        matrix.push(
            equations[i].slice()
        );
    }

    return matrix;
}

function computeSteps(originalMatrix, wantRref) {
    const result = [];

    const matrix = originalMatrix.map(
        row => row.slice()
    );

    const rows = matrix.length;
    const cols = matrix[0].length;

    result.push({
        title: "المصفوفة المبدئية Augmented Matrix",
        matrix: cloneMatrix(matrix),
        row: -1,
        col: -1
    });

    let currentRow = 0;

    const pivots = [];

    for (
        let col = 0;
        col < cols - 1 &&
        currentRow < rows;
        col++
    ) {
        let pivotRow = currentRow;

        for (
            let row = currentRow + 1;
            row < rows;
            row++
        ) {
            if (
                Math.abs(matrix[row][col]) >
                Math.abs(matrix[pivotRow][col])
            ) {
                pivotRow = row;
            }
        }

        if (
            Math.abs(matrix[pivotRow][col]) <
            1e-12
        ) {
            result.push({
                title:
                    "العمود " +
                    getColumnName(col) +
                    " كله أصفار في الأماكن المتبقية، لذلك نتخطاه.",
                matrix: cloneMatrix(matrix),
                row: -1,
                col: col
            });

            continue;
        }

        if (pivotRow !== currentRow) {
            const temp = matrix[currentRow];

            matrix[currentRow] = matrix[pivotRow];

            matrix[pivotRow] = temp;

            result.push({
                title:
                    "تبديل الصفوف: R" +
                    (currentRow + 1) +
                    " ↔ R" +
                    (pivotRow + 1),
                matrix: cloneMatrix(matrix),
                row: currentRow,
                col: col
            });
        }

        const pivot = matrix[currentRow][col];

        if (
            Math.abs(pivot - 1) >
            1e-12
        ) {
            for (
                let c = 0;
                c < cols;
                c++
            ) {
                matrix[currentRow][c] /= pivot;
            }

            result.push({
                title:
                    "تطبيع الصف: R" +
                    (currentRow + 1) +
                    " → R" +
                    (currentRow + 1) +
                    " ÷ (" +
                    formatNumber(pivot) +
                    ")",
                matrix: cloneMatrix(matrix),
                row: currentRow,
                col: col
            });
        }

        for (
            let row = currentRow + 1;
            row < rows;
            row++
        ) {
            const factor = matrix[row][col];

            if (
                Math.abs(factor) <
                1e-12
            ) {
                continue;
            }

            for (
                let c = 0;
                c < cols;
                c++
            ) {
                matrix[row][c] -=
                    factor *
                    matrix[currentRow][c];
            }

            cleanMatrix(matrix);

            result.push({
                title:
                    "إزالة العنصر أسفل المحور: R" +
                    (row + 1) +
                    " → R" +
                    (row + 1) +
                    " − (" +
                    formatNumber(factor) +
                    ") × R" +
                    (currentRow + 1),
                matrix: cloneMatrix(matrix),
                row: row,
                col: col
            });
        }

        pivots.push({
            row: currentRow,
            col: col
        });

        currentRow++;
    }

    cleanMatrix(matrix);

    result.push({
        title: "وصلنا إلى REF - Row Echelon Form",
        matrix: cloneMatrix(matrix),
        row: -1,
        col: -1
    });

    if (wantRref) {
        for (
            let k = pivots.length - 1;
            k >= 0;
            k--
        ) {
            const pivotRow = pivots[k].row;
            const pivotCol = pivots[k].col;

            for (
                let row = pivotRow - 1;
                row >= 0;
                row--
            ) {
                const factor = matrix[row][pivotCol];

                if (
                    Math.abs(factor) <
                    1e-12
                ) {
                    continue;
                }

                for (
                    let c = 0;
                    c < cols;
                    c++
                ) {
                    matrix[row][c] -=
                        factor *
                        matrix[pivotRow][c];
                }

                cleanMatrix(matrix);

                result.push({
                    title:
                        "تصفية فوق المحور: R" +
                        (row + 1) +
                        " → R" +
                        (row + 1) +
                        " − (" +
                        formatNumber(factor) +
                        ") × R" +
                        (pivotRow + 1),
                    matrix: cloneMatrix(matrix),
                    row: row,
                    col: pivotCol
                });
            }
        }

        result.push({
            title: "وصلنا إلى RREF - Reduced Row Echelon Form",
            matrix: cloneMatrix(matrix),
            row: -1,
            col: -1
        });
    }

    return result;
}

function showCurrent() {
    if (
        stepIndex < 0 ||
        stepIndex >= steps.length
    ) {
        return;
    }

    const current = steps[stepIndex];

    renderMatrix(
        current.matrix,
        current.row,
        current.col
    );

    stepCounter.textContent =
        "الخطوة " +
        (stepIndex + 1) +
        " من " +
        steps.length;

    statusMessage.textContent = current.title;

    operationText.textContent = current.title;

    previousBtn.disabled = stepIndex <= 0;

    nextBtn.disabled = stepIndex >= steps.length - 1;
}

function renderMatrix(
    matrix = null,
    highlightedRow = -1,
    highlightedCol = -1
) {
    matrixTable.innerHTML = "";

    if (!matrix) {
        return;
    }

    const headerRow = document.createElement("tr");

    for (
        let col = 0;
        col < matrix[0].length;
        col++
    ) {
        const th = document.createElement("th");

        if (col < n) {
            th.textContent = getVariableName(col);
        } else {
            th.textContent = "b";
        }

        headerRow.appendChild(th);
    }

    matrixTable.appendChild(headerRow);

    for (
        let row = 0;
        row < matrix.length;
        row++
    ) {
        const tr = document.createElement("tr");

        for (
            let col = 0;
            col < matrix[row].length;
            col++
        ) {
            const td = document.createElement("td");

            td.textContent = formatNumber(
                matrix[row][col]
            );

            if (row === highlightedRow) {
                td.classList.add("highlight-row");
            }

            if (col === highlightedCol) {
                td.classList.add("highlight-column");
            }

            if (
                row === highlightedRow &&
                col === highlightedCol
            ) {
                td.classList.add("pivot");
            }

            tr.appendChild(td);
        }

        matrixTable.appendChild(tr);
    }
}

function renderEmptyMatrix() {
    matrixTable.innerHTML = "";

    const tr = document.createElement("tr");

    for (
        let col = 0;
        col <= n;
        col++
    ) {
        const th = document.createElement("th");

        th.textContent =
            col < n
                ? getVariableName(col)
                : "b";

        tr.appendChild(th);
    }

    matrixTable.appendChild(tr);
}

function nextStep() {
    if (steps.length === 0) {
        return;
    }

    if (stepIndex < steps.length - 1) {
        stepIndex++;
        showCurrent();
    } else {
        stopAuto();

        statusMessage.textContent +=
            " - انتهت كل الخطوات.";
    }
}

function previousStep() {
    if (steps.length === 0) {
        return;
    }

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

    autoTimer = setInterval(
        nextStep,
        900
    );
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

function resetInput() {
    stopAuto();

    n = Number(variablesCount.value);

    m = Number(equationsCount.value);

    equations = [];
    rawEquations = [];
    steps = [];
    stepIndex = -1;

    equationInput.value = "";
    equationInput.disabled = false;
    addEquationBtn.disabled = false;
    buildBtn.disabled = true;

    previousBtn.disabled = true;
    nextBtn.disabled = true;
    autoBtn.disabled = true;
    resetStepsBtn.disabled = true;

    renderEquations();
    updateCounter();
    renderEmptyMatrix();

    statusMessage.textContent =
        "في انتظار إدخال المعادلات...";

    stepCounter.textContent = "-";

    operationText.textContent =
        "لم تبدأ الخوارزمية بعد.";
}

function cloneMatrix(matrix) {
    return matrix.map(
        row => row.slice()
    );
}

function cleanMatrix(matrix) {
    for (
        let row = 0;
        row < matrix.length;
        row++
    ) {
        for (
            let col = 0;
            col < matrix[row].length;
            col++
        ) {
            if (
                Math.abs(matrix[row][col]) <
                1e-12
            ) {
                matrix[row][col] = 0;
            }
        }
    }
}

function formatNumber(value) {
    if (
        Math.abs(value) <
        1e-12
    ) {
        return "0";
    }

    const rounded = Math.round(value);

    if (
        Math.abs(
            value - rounded
        ) < 1e-9
    ) {
        return String(rounded);
    }

    return Number(
        value.toFixed(3)
    ).toString();
}

function getVariableName(index) {
    const variables = ["x", "y", "z", "w"];

    return variables[index];
}

function getColumnName(index) {
    return getVariableName(index);
}

function escapeHtml(text) {
    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}