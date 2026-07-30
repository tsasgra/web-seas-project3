const DATA_FILES = [
    { file: 'data/qwen14Boutput.jsonl', org: 'Alibaba Cloud', displayName: 'Qwen 2.5 14B Instruct' },
    { file: 'data/qwen7Boutput.jsonl', org: 'Alibaba Cloud', displayName: 'Qwen 2.5 7B Instruct' },
    { file: 'data/qwen3Boutput.jsonl', org: 'Alibaba Cloud', displayName: 'Qwen 2.5 3B Instruct' },
    { file: 'data/qwen0.5Boutput.jsonl', org: 'Alibaba Cloud', displayName: 'Qwen 2.5 0.5B Instruct' },
    { file: 'data/gemma4Boutput.jsonl', org: 'Google', displayName: 'Gemma 3 4B IT' },
    { file: 'data/mistral7Boutput.jsonl', org: 'Mistral AI', displayName: 'Mistral 7B Instruct v0.3' },
    { file: 'data/seallm7Boutput.jsonl', org: 'Sea AI Lab', displayName: 'SeaLLM v3 7B Chat' },
    { file: 'data/vistral7boutput.jsonl', org: 'Viet-Mistral', displayName: 'Vistral 7B Chat' }
];

const QA_GOLD_FILE = 'data/probe_dialects.jsonl';

const DIALECTS = [
    { key: 'standard', label: 'Chuẩn' },
    { key: 'PNB', label: 'PNB' },
    { key: 'PNT1', label: 'PNT1' },
    { key: 'PNT2', label: 'PNT2' },
    { key: 'PNT3', label: 'PNT3' },
    { key: 'PNT4', label: 'PNT4' },
    { key: 'PNN', label: 'PNN' }
];

const TASKS = [
    { key: 'mcqa', label: 'Trắc nghiệm' },
    { key: 'nli', label: 'Suy luận NLI' },
    { key: 'qa', label: 'QA' },
    { key: 'sentiment', label: 'Cảm xúc' }
];

let modelsData = [];
let selectedModels = [];
const chartColors = ['#1e3a5f', '#2a4b73', '#335c87', '#3c6e9c', '#4680b0', '#5592c3', '#66a2d1', '#7bb4e0', '#8ac2eb', '#9bd0f3'];

let overallChartInstance = null;
let radarChartInstance = null;
let categoryChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';

    setStatus('Đang tải dữ liệu từ các file JSONL...');

    try {
        const qaGoldMap = await loadQaGoldMap();
        modelsData = await loadAllModels(qaGoldMap);
        selectedModels = modelsData.slice(0, 3).map((model) => model.name);

        initOverallChart();
        initRadarAndCategoryCharts();
        initTableAndCards();
        initSelectionUI();
        updateChartsData();

        const totalRows = modelsData.reduce((sum, model) => sum + model.rows, 0);
        const validRows = modelsData.reduce((sum, model) => sum + model.validRows, 0);
        const skippedRows = modelsData.reduce((sum, model) => sum + model.skippedRows, 0);
        setStatus(`Đã tải ${totalRows.toLocaleString('vi-VN')} dòng từ ${modelsData.length} file. Tính accuracy trên ${validRows.toLocaleString('vi-VN')} dòng có gold; bỏ qua ${skippedRows.toLocaleString('vi-VN')} dòng thiếu gold.`);
    } catch (error) {
        console.error(error);
        setStatus('Không tải được dữ liệu. Hãy chạy web bằng server tĩnh, ví dụ: npx serve .', true);
    }
});

async function loadQaGoldMap() {
    const response = await fetch(QA_GOLD_FILE);
    if (!response.ok) {
        throw new Error(`Cannot load ${QA_GOLD_FILE}: ${response.status}`);
    }

    const text = await response.text();
    const qaGoldMap = new Map();

    text.split(/\r?\n/).filter(Boolean).forEach((line) => {
        const row = parseJsonLine(line);
        if (row?.task === 'qa' && Array.isArray(row.answers) && row.answers.length > 0) {
            qaGoldMap.set(row.id, row.answers);
        }
    });

    return qaGoldMap;
}

async function loadAllModels(qaGoldMap) {
    const summaries = await Promise.all(DATA_FILES.map(async (source) => {
        const response = await fetch(source.file);
        if (!response.ok) {
            throw new Error(`Cannot load ${source.file}: ${response.status}`);
        }

        const text = await response.text();
        return summarizeModel(text, source, qaGoldMap);
    }));

    return summaries
        .sort((a, b) => b.score - a.score)
        .map((model, index) => ({ ...model, rank: index + 1 }));
}

function summarizeModel(text, source, qaGoldMap) {
    const summary = createCounter();
    const dialectCounters = Object.fromEntries(DIALECTS.map(({ key }) => [key, createCounter()]));
    const taskCounters = Object.fromEntries(TASKS.map(({ key }) => [key, createCounter()]));
    const lines = text.split(/\r?\n/).filter(Boolean);
    let parsedModelName = source.displayName;

    lines.forEach((line) => {
        const row = parseJsonLine(line);
        if (!row) return;

        parsedModelName = row.model_name || parsedModelName;
        summary.rows += 1;

        const gold = getGold(row, qaGoldMap);
        if (!isScorableGold(gold)) {
            summary.skippedRows += 1;
            return;
        }

        const correct = isCorrect(gold, row.prediction);
        addScore(summary, correct);

        if (dialectCounters[row.dialect_group]) {
            addScore(dialectCounters[row.dialect_group], correct);
        }

        if (taskCounters[row.task]) {
            addScore(taskCounters[row.task], correct);
        }
    });

    return {
        name: source.displayName,
        rawName: parsedModelName,
        org: source.org,
        file: source.file,
        rows: summary.rows,
        validRows: summary.total,
        skippedRows: summary.skippedRows,
        score: toPercent(summary.correct, summary.total),
        ...Object.fromEntries(DIALECTS.map(({ key }) => [key, toPercent(dialectCounters[key].correct, dialectCounters[key].total)])),
        taskScores: Object.fromEntries(TASKS.map(({ key }) => [key, toPercent(taskCounters[key].correct, taskCounters[key].total)])),
        taskCounts: Object.fromEntries(TASKS.map(({ key }) => [key, taskCounters[key].total]))
    };
}

function createCounter() {
    return { rows: 0, skippedRows: 0, correct: 0, total: 0 };
}

function addScore(counter, correct) {
    counter.total += 1;
    if (correct) counter.correct += 1;
}

function parseJsonLine(line) {
    try {
        return JSON.parse(line.replace(/:\s*NaN(?=\s*[,}])/g, ': null'));
    } catch (error) {
        console.warn('Bỏ qua dòng JSONL không đọc được:', line, error);
        return null;
    }
}

function getGold(row, qaGoldMap) {
    if (row.task === 'qa' && qaGoldMap.has(row.id)) {
        return qaGoldMap.get(row.id);
    }

    return row.gold;
}

function isScorableGold(gold) {
    if (Array.isArray(gold)) {
        return gold.some((answer) => String(answer ?? '').trim() !== '');
    }

    return gold !== null && gold !== undefined && String(gold).trim() !== '';
}

function isCorrect(gold, prediction) {
    const normalizedPrediction = normalizeAnswer(prediction);
    const goldAnswers = Array.isArray(gold) ? gold : [gold];

    return goldAnswers.some((answer) => normalizeAnswer(answer) === normalizedPrediction);
}

function normalizeAnswer(value) {
    return String(value ?? '').trim().toLowerCase();
}

function toPercent(correct, total) {
    return total > 0 ? (correct / total) * 100 : null;
}

function setStatus(message, isError = false) {
    const status = document.getElementById('dataStatus');
    if (!status) return;

    status.textContent = message;
    status.classList.toggle('text-[#1e3a5f]', isError);
    status.classList.toggle('text-slate-500', !isError);
}

function initSelectionUI() {
    const dropdownBtn = document.getElementById('toggleDropdownBtn');
    const dropdownMenu = document.getElementById('modelDropdown');
    const dropdownList = document.getElementById('dropdownList');
    const selectAllBtn = document.getElementById('selectAllBtn');

    dropdownList.innerHTML = '';

    dropdownBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!dropdownBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    modelsData.forEach((model) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <label class="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer select-none group">
                <div class="flex min-w-0 items-center gap-3">
                    <input type="checkbox" value="${escapeHtml(model.name)}" class="model-checkbox w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]">
                    <span class="truncate text-sm text-slate-800 font-medium group-hover:text-black">${escapeHtml(model.name)}</span>
                </div>
                <div class="flex shrink-0 items-center gap-2 text-xs">
                    <span class="text-slate-400">${escapeHtml(model.org)}</span>
                    <span class="font-bold text-slate-700">${formatScore(model.score)}</span>
                </div>
            </label>
        `;
        dropdownList.appendChild(li);
    });

    document.querySelectorAll('.model-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                if (selectedModels.length >= 10) {
                    alert('Chỉ được chọn tối đa 10 mô hình');
                    event.target.checked = false;
                    return;
                }
                selectedModels.push(event.target.value);
            } else {
                selectedModels = selectedModels.filter((name) => name !== event.target.value);
            }
            updateSelectionUI();
            updateChartsData();
        });
    });

    selectAllBtn.addEventListener('change', (event) => {
        selectedModels = event.target.checked
            ? modelsData.slice(0, 10).map((model) => model.name)
            : [];
        updateSelectionUI();
        updateChartsData();
    });

    updateSelectionUI();
}

function updateSelectionUI() {
    document.querySelectorAll('.model-checkbox').forEach((checkbox) => {
        checkbox.checked = selectedModels.includes(checkbox.value);
    });

    const selectAllBtn = document.getElementById('selectAllBtn');
    selectAllBtn.checked = selectedModels.length === Math.min(modelsData.length, 10);

    const tagsContainer = document.getElementById('selectedTags');
    tagsContainer.innerHTML = '';

    selectedModels.forEach((modelName, index) => {
        const model = modelsData.find((item) => item.name === modelName);
        if (!model) return;

        const color = chartColors[index % chartColors.length];
        const tag = document.createElement('div');
        tag.className = 'flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm';
        tag.innerHTML = `
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: ${color}"></span>
            <span class="truncate">${escapeHtml(model.name)}</span>
            <span class="shrink-0 text-slate-400 font-normal">(${formatScore(model.score)})</span>
            <button class="ml-1 text-slate-400 hover:text-[#1e3a5f] focus:outline-none" type="button" aria-label="Bỏ chọn ${escapeHtml(model.name)}" onclick="removeModel('${escapeForAttribute(model.name)}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        tagsContainer.appendChild(tag);
    });
}

window.removeModel = function removeModel(modelName) {
    selectedModels = selectedModels.filter((name) => name !== modelName);
    updateSelectionUI();
    updateChartsData();
};

function initRadarAndCategoryCharts() {
    const ctxRadar = document.getElementById('radarChart').getContext('2d');
    radarChartInstance = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: [...DIALECTS.map(({ label }) => label), ...TASKS.map(({ label }) => label)],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 25 },
                    pointLabels: { font: { size: 11 } }
                }
            }
        }
    });

    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'bar',
        data: {
            labels: TASKS.map(({ label }) => label),
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { borderDash: [5, 5] } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateChartsData() {
    const activeModels = selectedModels
        .map((name) => modelsData.find((model) => model.name === name))
        .filter(Boolean);

    radarChartInstance.data.datasets = activeModels.map((model, index) => ({
        label: model.name,
        data: [
            ...DIALECTS.map(({ key }) => model[key] ?? 0),
            ...TASKS.map(({ key }) => model.taskScores[key] ?? 0)
        ],
        borderColor: chartColors[index % chartColors.length],
        backgroundColor: `${chartColors[index % chartColors.length]}26`,
        borderWidth: 2,
        pointBackgroundColor: chartColors[index % chartColors.length],
        pointRadius: 3
    }));
    radarChartInstance.update();

    categoryChartInstance.data.datasets = activeModels.map((model, index) => ({
        label: model.name,
        data: TASKS.map(({ key }) => model.taskScores[key] ?? 0),
        backgroundColor: chartColors[index % chartColors.length],
        borderRadius: 4
    }));
    categoryChartInstance.update();
}

function initOverallChart() {
    const ctxOverall = document.getElementById('overallChart').getContext('2d');
    overallChartInstance = new Chart(ctxOverall, {
        type: 'bar',
        data: {
            labels: modelsData.map((model) => model.name),
            datasets: [{
                label: 'Điểm tổng hợp',
                data: modelsData.map((model) => model.score),
                backgroundColor: modelsData.map((_, index) => chartColors[index % chartColors.length]),
                borderRadius: 4,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { borderDash: [5, 5] } },
                x: { grid: { display: false }, ticks: { maxRotation: 35, minRotation: 20 } }
            }
        }
    });
}

function initTableAndCards() {
    renderTable();
    renderSubjectCards();
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    modelsData.forEach((model) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b transition-colors hover:bg-slate-50';
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold">${model.rank}</td>
            <td class="px-6 py-4">
                <div class="font-bold text-slate-900">${escapeHtml(model.name)}</div>
                <div class="text-xs text-slate-400">${escapeHtml(model.rawName)}</div>
            </td>
            <td class="px-6 py-4 text-slate-500">${escapeHtml(model.org)}</td>
            <td class="px-6 py-4 font-bold border-r text-lg">${formatScore(model.score)}</td>
            ${DIALECTS.map(({ key }) => `<td class="px-4 py-4 ${getCellColor(model[key])}">${formatScore(model[key])}</td>`).join('')}
            <td class="px-4 py-4 text-slate-500">${model.validRows.toLocaleString('vi-VN')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSubjectCards() {
    const cardsContainer = document.getElementById('subjectCards');
    cardsContainer.innerHTML = '';

    DIALECTS.forEach((dialect) => {
        const sortedModels = [...modelsData]
            .sort((a, b) => (b[dialect.key] ?? -1) - (a[dialect.key] ?? -1))
            .slice(0, 3);
        const average = averageScore(modelsData.map((model) => model[dialect.key]));

        const barsHtml = sortedModels.map((model) => {
            const value = model[dialect.key] ?? 0;
            return `
                <div class="mb-3">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-slate-600 truncate pr-2 w-2/3">${escapeHtml(model.name)}</span>
                        <span class="font-bold">${formatScore(value)}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2.5">
                        <div class="h-2.5 rounded-full bg-[#1e3a5f]" style="width: ${Math.max(0, Math.min(100, value))}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        cardsContainer.innerHTML += `
            <div class="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
                <div class="flex justify-between items-center gap-4 mb-4">
                    <div>
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-[#1e3a5f]"></span> ${escapeHtml(dialect.label)}
                        </h3>
                        <p class="text-[10px] text-slate-400">Accuracy theo phương ngữ</p>
                    </div>
                    <div class="shrink-0 font-bold text-sm text-slate-800">TB: ${formatScore(average)}</div>
                </div>
                <div class="mt-4">${barsHtml}</div>
            </div>
        `;
    });
}

function getCellColor(score) {
    if (score === null || score === undefined) return 'bg-slate-50 text-slate-400';
    if (score >= 65) return 'bg-slate-300 font-bold text-slate-900';
    if (score >= 55) return 'bg-slate-200 text-slate-800';
    if (score < 45) return 'bg-slate-100 text-slate-500';
    return 'bg-white';
}

function averageScore(values) {
    const validValues = values.filter((value) => value !== null && value !== undefined);
    return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function formatScore(score) {
    return score === null || score === undefined || Number.isNaN(score)
        ? 'N/A'
        : score.toFixed(2);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function escapeForAttribute(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
