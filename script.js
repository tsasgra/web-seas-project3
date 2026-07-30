// --- 1. MOCK DATA ---
const modelsData = [
    { rank: 1, name: "Qwen 2.5 14B Instruct", org: "Alibaba Cloud", score: 82.5, pnb: 88.0, pnt1: 82.0, pnt2: 85.1, pnt3: 86.1, pnt4: 80.2, pnn: 84.7, cat1: 85, cat2: 88, cat3: 82, cat4: 78, cat5: 80 },
    { rank: 2, name: "Qwen 2.5 7B Instruct", org: "Alibaba Cloud", score: 79.8, pnb: 85.5, pnt1: 78.7, pnt2: 80.1, pnt3: 82.2, pnt4: 75.1, pnn: 80.7, cat1: 80, cat2: 84, cat3: 79, cat4: 75, cat5: 76 },
    { rank: 3, name: "Gemma 3 4B IT", org: "Google", score: 77.6, pnb: 84.8, pnt1: 75.9, pnt2: 80.6, pnt3: 78.2, pnt4: 71.9, pnn: 82.2, cat1: 78, cat2: 85, cat3: 77, cat4: 72, cat5: 70 },
    { rank: 4, name: "Mistral 7B Instruct v0.3", org: "Mistral AI", score: 76.4, pnb: 83.0, pnt1: 74.0, pnt2: 78.2, pnt3: 76.2, pnt4: 70.9, pnn: 75.2, cat1: 77, cat2: 82, cat3: 75, cat4: 70, cat5: 68 },
    { rank: 5, name: "SeaLLM 7B Chat", org: "Sea AI Lab", score: 75.9, pnb: 82.2, pnt1: 75.1, pnt2: 77.4, pnt3: 78.3, pnt4: 69.2, pnn: 74.5, cat1: 76, cat2: 80, cat3: 78, cat4: 71, cat5: 65 },
    { rank: 6, name: "Vistral 7B Chat", org: "Vistral", score: 74.5, pnb: 81.7, pnt1: 72.3, pnt2: 75.7, pnt3: 76.7, pnt4: 68.6, pnn: 76.8, cat1: 75, cat2: 78, cat3: 74, cat4: 69, cat5: 66 },
    { rank: 7, name: "Qwen 2.5 3B Instruct", org: "Alibaba Cloud", score: 71.2, pnb: 78.5, pnt1: 68.4, pnt2: 72.1, pnt3: 73.5, pnt4: 65.2, pnn: 70.4, cat1: 72, cat2: 75, cat3: 70, cat4: 65, cat5: 60 },
    { rank: 8, name: "Qwen 2.5 0.5B Instruct", org: "Alibaba Cloud", score: 65.4, pnb: 72.0, pnt1: 60.5, pnt2: 65.3, pnt3: 68.1, pnt4: 58.7, pnn: 64.2, cat1: 65, cat2: 68, cat3: 62, cat4: 55, cat5: 50 }
];

let selectedModels = [modelsData[0].name, modelsData[1].name, modelsData[2].name]; 
const chartColors = ['#1e3a5f', '#1082c5', '#5ec8c6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#14b8a6'];

let radarChartInstance = null;
let categoryChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';

    initOverallChart();
    initTableAndCards();
    initSelectionUI();
    initRadarAndCategoryCharts();
    updateChartsData();
});

function initSelectionUI() {
    const dropdownBtn = document.getElementById('toggleDropdownBtn');
    const dropdownMenu = document.getElementById('modelDropdown');
    const dropdownList = document.getElementById('dropdownList');
    const selectAllBtn = document.getElementById('selectAllBtn');

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    modelsData.forEach((model) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <label class="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer select-none group">
                <div class="flex items-center gap-3">
                    <input type="checkbox" value="${model.name}" class="model-checkbox w-4 h-4 rounded border-slate-300 text-[#1e3a5f] focus:ring-[#1e3a5f]">
                    <span class="text-sm text-slate-800 font-medium group-hover:text-black">${model.name}</span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                    <span class="text-slate-400">${model.org}</span>
                    <span class="font-bold text-slate-700">${model.score}</span>
                </div>
            </label>
        `;
        dropdownList.appendChild(li);
    });

    const checkboxes = document.querySelectorAll('.model-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            if(e.target.checked) {
                if(selectedModels.length >= 10) {
                    alert("Chỉ được chọn tối đa 10 mô hình");
                    e.target.checked = false;
                    return;
                }
                selectedModels.push(e.target.value);
            } else {
                selectedModels = selectedModels.filter(name => name !== e.target.value);
            }
            updateSelectionUI();
            updateChartsData();
        });
    });

    selectAllBtn.addEventListener('change', (e) => {
        if(e.target.checked) {
            selectedModels = modelsData.slice(0, 10).map(m => m.name);
        } else {
            selectedModels = [];
        }
        updateSelectionUI();
        updateChartsData();
    });

    updateSelectionUI();
}

function updateSelectionUI() {
    const checkboxes = document.querySelectorAll('.model-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectedModels.includes(cb.value);
    });
    
    document.getElementById('selectAllBtn').checked = selectedModels.length === modelsData.length || selectedModels.length === 10;

    const tagsContainer = document.getElementById('selectedTags');
    tagsContainer.innerHTML = '';
    
    selectedModels.forEach((modelName, index) => {
        const model = modelsData.find(m => m.name === modelName);
        const color = chartColors[index % chartColors.length];
        
        const tag = document.createElement('div');
        tag.className = 'flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-sm font-medium text-slate-700';
        tag.innerHTML = `
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
            ${model.name} 
            <span class="text-slate-400 font-normal">(${model.score})</span>
            <button class="ml-1 text-slate-400 hover:text-red-500 focus:outline-none" onclick="removeModel('${model.name}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        tagsContainer.appendChild(tag);
    });
}

window.removeModel = function(modelName) {
    selectedModels = selectedModels.filter(name => name !== modelName);
    updateSelectionUI();
    updateChartsData();
}

function initRadarAndCategoryCharts() {
    const ctxRadar = document.getElementById('radarChart').getContext('2d');
    radarChartInstance = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['PNB', 'PNT1', 'PNT2', 'PNT3', 'PNT4', 'PNN', 'Hate speech', 'Văn hóa VN', 'Sức khoẻ', 'Agentic'],
            datasets: []
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } }, 
            scales: { r: { min: 0, max: 100, ticks: { stepSize: 25 }, pointLabels: { font: { size: 10 } } } }
        }
    });

    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'bar',
        data: {
            labels: ['Kiến thức học thuật', 'An toàn và chủ quyền số', 'Trí thức văn hóa xã hội', 'Y tế và sức khỏe', 'Agentic'],
            datasets: []
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } }
        }
    });
}

function updateChartsData() {
    const activeModels = selectedModels.map(name => modelsData.find(m => m.name === name));
    
    radarChartInstance.data.datasets = activeModels.map((model, index) => ({
        label: model.name,
        data: [model.pnb, model.pnt1, model.pnt2, model.pnt3, model.pnt4, model.pnn, 90, 78, 82, model.cat5],
        borderColor: chartColors[index % chartColors.length],
        backgroundColor: chartColors[index % chartColors.length] + '1A', 
        borderWidth: 2,
        pointBackgroundColor: chartColors[index % chartColors.length],
        pointRadius: 3
    }));
    radarChartInstance.update();

    categoryChartInstance.data.datasets = activeModels.map((model, index) => ({
        label: model.name,
        data: [model.cat1, model.cat2, model.cat3, model.cat4, model.cat5],
        backgroundColor: chartColors[index % chartColors.length],
        borderRadius: 4
    }));
    categoryChartInstance.update();
}

function initOverallChart() {
    const ctxOverall = document.getElementById('overallChart').getContext('2d');
    new Chart(ctxOverall, {
        type: 'bar',
        data: {
            labels: modelsData.map(m => m.name),
            datasets: [{
                label: 'Điểm tổng hợp',
                data: modelsData.map(m => m.score),
                backgroundColor: ['#1e3a5f', '#2a4b73', '#335c87', '#3c6e9c', '#4680b0', '#5592c3', '#66a2d1', '#7bb4e0'],
                borderRadius: 4, barPercentage: 0.6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { borderDash: [5, 5] } },
                x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

function initTableAndCards() {
    const tbody = document.getElementById('tableBody');
    function getCellColor(score) {
        if(score >= 85) return 'bg-slate-300 font-bold';
        if(score >= 70) return 'bg-slate-200';
        if(score < 60) return 'bg-slate-100 text-slate-500';
        return 'bg-white';
    }
    modelsData.forEach(model => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold">${model.rank}</td>
            <td class="px-6 py-4 font-bold text-slate-900">${model.name}</td>
            <td class="px-6 py-4 text-slate-400">${model.org}</td>
            <td class="px-6 py-4 font-bold border-r text-lg">${model.score.toFixed(2)}</td>
            <td class="px-4 py-4 ${getCellColor(model.pnb)}">${model.pnb.toFixed(1)}</td>
            <td class="px-4 py-4 ${getCellColor(model.pnt1)}">${model.pnt1.toFixed(1)}</td>
            <td class="px-4 py-4 ${getCellColor(model.pnt2)}">${model.pnt2.toFixed(1)}</td>
            <td class="px-4 py-4 ${getCellColor(model.pnt3)}">${model.pnt3.toFixed(1)}</td>
            <td class="px-4 py-4 ${getCellColor(model.pnt4)}">${model.pnt4.toFixed(1)}</td>
            <td class="px-4 py-4 border-r ${getCellColor(model.pnn)}">${model.pnn.toFixed(1)}</td>
        `;
        tbody.appendChild(tr);
    });

    const subjects = [
        { key: 'pnb', name: 'Phương ngữ Bắc (PNB)', avg: 82.5 },
        { key: 'pnt1', name: 'Phương ngữ Trung (PNT1)', avg: 72.2 },
        { key: 'pnn', name: 'Phương ngữ Nam (PNN)', avg: 76.0 }
    ];
    const cardsContainer = document.getElementById('subjectCards');
    subjects.forEach(sub => {
        let barsHtml = '';
        for(let i=0; i<3; i++) { // Render top 3 for the cards
            let m = modelsData[i]; let val = m[sub.key];
            barsHtml += `
                <div class="mb-3">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-slate-600 truncate pr-2 w-2/3">${m.name}</span>
                        <span class="font-bold">${val.toFixed(1)}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2.5">
                        <div class="bg-[#1e3a5f] h-2.5 rounded-full" style="width: ${val}%"></div>
                    </div>
                </div>
            `;
        }
        cardsContainer.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-[#1e3a5f]"></span> ${sub.name}
                        </h3>
                        <p class="text-[10px] text-slate-400">Ngôn ngữ địa phương</p>
                    </div>
                    <div class="font-bold text-sm text-slate-800">Trung bình: ${sub.avg}</div>
                </div>
                <div class="mt-4">${barsHtml}</div>
            </div>
        `;
    });
}
