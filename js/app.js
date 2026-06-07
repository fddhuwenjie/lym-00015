const App = (function() {

    let state = {
        components: [],
        sampleRate: 44100,
        windowSize: 1024,
        timeZoom: 10,
        windowFunction: 'hann',
        showWindowComparison: false,
        filterType: 'none',
        filterFc1: 1000,
        filterFc2: 3000,
        filterOrder: 32,
        spectrumType: 'magnitude',
        logScale: true,
        importedSignal: null,
        currentSignal: null,
        currentSpectrum: null,
        filteredSignal: null,
        filteredSpectrum: null,
        timeAxis: null,
        freqAxis: null
    };

    const elements = {};

    function init() {
        cacheElements();
        bindEvents();
        loadDefaultComponents();
        update();
        
        window.addEventListener('resize', () => update());
    }

    function cacheElements() {
        elements.signalComponents = document.getElementById('signal-components');
        elements.btnAddComponent = document.getElementById('btn-add-component');
        elements.sampleRate = document.getElementById('sample-rate');
        elements.windowSize = document.getElementById('window-size');
        elements.timeZoom = document.getElementById('time-zoom');
        elements.timeZoomValue = document.getElementById('time-zoom-value');
        elements.windowFunction = document.getElementById('window-function');
        elements.showWindowComparison = document.getElementById('show-window-comparison');
        elements.filterType = document.getElementById('filter-type');
        elements.filterFc1 = document.getElementById('filter-fc1');
        elements.filterFc2 = document.getElementById('filter-fc2');
        elements.fc2Group = document.getElementById('fc2-group');
        elements.filterOrder = document.getElementById('filter-order');
        elements.filterOrderValue = document.getElementById('filter-order-value');
        elements.spectrumType = document.getElementById('spectrum-type');
        elements.logScale = document.getElementById('log-scale');
        elements.btnImport = document.getElementById('btn-import');
        elements.fileImport = document.getElementById('file-import');
        elements.btnExportSignal = document.getElementById('btn-export-signal');
        elements.btnExportSpectrum = document.getElementById('btn-export-spectrum');
        elements.btnReset = document.getElementById('btn-reset');
        elements.timeCanvas = document.getElementById('time-domain-canvas');
        elements.freqCanvas = document.getElementById('frequency-domain-canvas');
        elements.filteredTimeCanvas = document.getElementById('filtered-time-canvas');
        elements.filteredFreqCanvas = document.getElementById('filtered-freq-canvas');
        elements.windowCompCanvas = document.getElementById('window-comp-canvas');
        elements.filterContainer = document.getElementById('filter-container');
        elements.windowCompContainer = document.getElementById('window-comp-container');
        elements.signalInfo = document.getElementById('signal-info');
        elements.spectrumInfo = document.getElementById('spectrum-info');
    }

    function bindEvents() {
        elements.btnAddComponent.addEventListener('click', addComponent);
        elements.sampleRate.addEventListener('change', () => {
            state.sampleRate = parseInt(elements.sampleRate.value);
            update();
        });
        elements.windowSize.addEventListener('change', () => {
            state.windowSize = parseInt(elements.windowSize.value);
            update();
        });
        elements.timeZoom.addEventListener('input', () => {
            state.timeZoom = parseInt(elements.timeZoom.value);
            elements.timeZoomValue.textContent = (state.timeZoom / 10).toFixed(1) + 'x';
            update();
        });
        elements.windowFunction.addEventListener('change', () => {
            state.windowFunction = elements.windowFunction.value;
            update();
        });
        elements.showWindowComparison.addEventListener('change', () => {
            state.showWindowComparison = elements.showWindowComparison.checked;
            elements.windowCompContainer.style.display = state.showWindowComparison ? 'block' : 'none';
            update();
        });
        elements.filterType.addEventListener('change', () => {
            state.filterType = elements.filterType.value;
            elements.fc2Group.style.display = 
                (state.filterType === 'bandpass' || state.filterType === 'bandstop') ? 'block' : 'none';
            elements.filterContainer.style.display = state.filterType !== 'none' ? 'block' : 'none';
            update();
        });
        elements.filterFc1.addEventListener('change', () => {
            state.filterFc1 = parseFloat(elements.filterFc1.value);
            update();
        });
        elements.filterFc2.addEventListener('change', () => {
            state.filterFc2 = parseFloat(elements.filterFc2.value);
            update();
        });
        elements.filterOrder.addEventListener('input', () => {
            state.filterOrder = parseInt(elements.filterOrder.value);
            elements.filterOrderValue.textContent = state.filterOrder;
            update();
        });
        elements.spectrumType.addEventListener('change', () => {
            state.spectrumType = elements.spectrumType.value;
            update();
        });
        elements.logScale.addEventListener('change', () => {
            state.logScale = elements.logScale.checked;
            update();
        });
        elements.btnImport.addEventListener('click', () => elements.fileImport.click());
        elements.fileImport.addEventListener('change', handleFileImport);
        elements.btnExportSignal.addEventListener('click', exportSignal);
        elements.btnExportSpectrum.addEventListener('click', exportSpectrum);
        elements.btnReset.addEventListener('click', loadDefaultComponents);
    }

    function loadDefaultComponents() {
        state.components = SignalGenerator.getDefaultComponents();
        state.importedSignal = null;
        renderComponents();
        update();
    }

    function addComponent() {
        const comp = SignalGenerator.createComponent();
        state.components.push(comp);
        renderComponents();
        update();
    }

    function removeComponent(id) {
        state.components = state.components.filter(c => c.id !== id);
        renderComponents();
        update();
    }

    function updateComponent(id, field, value) {
        const comp = state.components.find(c => c.id === id);
        if (comp) {
            comp[field] = value;
            update();
        }
    }

    function renderComponents() {
        elements.signalComponents.innerHTML = '';
        
        state.components.forEach(comp => {
            const div = document.createElement('div');
            div.className = 'signal-component';
            
            div.innerHTML = `
                <div class="component-enabled">
                    <input type="checkbox" ${comp.enabled ? 'checked' : ''} 
                           onchange="App.updateComponent(${comp.id}, 'enabled', this.checked)">
                    <span>${SignalGenerator.getWaveformTypeName(comp.type)}</span>
                </div>
                <div class="component-header">
                    <select onchange="App.updateComponent(${comp.id}, 'type', this.value)">
                        <option value="sine" ${comp.type === 'sine' ? 'selected' : ''}>正弦波</option>
                        <option value="square" ${comp.type === 'square' ? 'selected' : ''}>方波</option>
                        <option value="sawtooth" ${comp.type === 'sawtooth' ? 'selected' : ''}>锯齿波</option>
                        <option value="triangle" ${comp.type === 'triangle' ? 'selected' : ''}>三角波</option>
                        <option value="noise" ${comp.type === 'noise' ? 'selected' : ''}>白噪声</option>
                    </select>
                    <button class="btn btn-danger" onclick="App.removeComponent(${comp.id})">删除</button>
                </div>
                <div class="component-controls">
                    <div class="form-group">
                        <label>频率(Hz)</label>
                        <input type="number" value="${comp.frequency}" min="0.1" max="20000" step="0.1"
                               onchange="App.updateComponent(${comp.id}, 'frequency', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>幅度</label>
                        <input type="number" value="${comp.amplitude}" min="0" max="10" step="0.01"
                               onchange="App.updateComponent(${comp.id}, 'amplitude', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>相位(π)</label>
                        <input type="number" value="${(comp.phase / Math.PI).toFixed(2)}" min="-1" max="1" step="0.01"
                               onchange="App.updateComponent(${comp.id}, 'phase', parseFloat(this.value) * Math.PI)">
                    </div>
                </div>
            `;
            
            elements.signalComponents.appendChild(div);
        });
    }

    function generateSignal() {
        if (state.importedSignal) {
            return state.importedSignal.slice(0, state.windowSize);
        }
        return SignalGenerator.generateSignal(
            state.components,
            state.sampleRate,
            state.windowSize
        );
    }

    function update() {
        const rawSignal = generateSignal();
        state.timeAxis = DSP.generateTimeAxis(state.windowSize, state.sampleRate);
        state.freqAxis = DSP.generateFrequencyAxis(state.windowSize, state.sampleRate);
        
        const window = DSP.WindowFunctions.generate(state.windowFunction, state.windowSize);
        const windowedSignal = DSP.WindowFunctions.apply(rawSignal, window);
        const coherentGain = DSP.WindowFunctions.getCoherentGain(window);
        const energyGain = DSP.WindowFunctions.getEnergyGain(window);
        state.currentWindow = window;
        state.currentCoherentGain = coherentGain;
        state.currentEnergyGain = energyGain;
        
        const fftResult = DSP.rfft(windowedSignal);
        state.currentSignal = rawSignal;
        state.currentSpectrum = fftResult;
        
        if (state.filterType !== 'none') {
            state.filteredSignal = DSP.applyFilter(
                rawSignal,
                state.filterType,
                state.filterOrder,
                state.filterFc1,
                state.filterFc2,
                state.sampleRate
            );
            
            const filteredWindowed = DSP.WindowFunctions.apply(state.filteredSignal, window);
            state.filteredSpectrum = DSP.rfft(filteredWindowed);
        } else {
            state.filteredSignal = null;
            state.filteredSpectrum = null;
        }
        
        render();
        updateInfo();
    }

    function render() {
        const zoom = state.timeZoom / 10;
        
        Plotter.drawTimeDomain(
            elements.timeCanvas,
            state.currentSignal,
            state.timeAxis,
            { zoom, color: '#00d4ff' }
        );
        
        if (state.spectrumType === 'phase') {
            const phase = DSP.computePhaseSpectrum(state.currentSpectrum);
            Plotter.drawPhaseSpectrum(
                elements.freqCanvas,
                phase,
                state.freqAxis,
                { maxFreq: state.sampleRate / 2 }
            );
        } else if (state.spectrumType === 'psd') {
            const psd = DSP.computePSD(state.currentSpectrum, state.sampleRate, state.currentEnergyGain);
            const psdDb = psd.map(v => DSP.linearToDb(Math.sqrt(v)));
            const peaks = SignalGenerator.findPeaks(state.freqAxis, psdDb);
            
            Plotter.drawFrequencyDomain(
                elements.freqCanvas,
                psd,
                state.freqAxis,
                { 
                    logScale: state.logScale, 
                    color: '#ff6b6b',
                    ylabel: state.logScale ? 'PSD (dB/Hz)' : 'PSD (V²/Hz)',
                    peaks: state.logScale ? peaks : null,
                    maxFreq: state.sampleRate / 2
                }
            );
        } else {
            const magnitude = DSP.computeMagnitudeSpectrum(state.currentSpectrum, state.currentCoherentGain);
            const magDb = magnitude.map(v => DSP.linearToDb(v));
            const peaks = SignalGenerator.findPeaks(state.freqAxis, magDb);
            
            Plotter.drawFrequencyDomain(
                elements.freqCanvas,
                magnitude,
                state.freqAxis,
                { 
                    logScale: state.logScale, 
                    color: '#7b2cbf',
                    peaks: state.logScale ? peaks : null,
                    maxFreq: state.sampleRate / 2
                }
            );
        }
        
        if (state.filterType !== 'none' && state.filteredSignal && state.filteredSpectrum) {
            Plotter.drawTimeDomain(
                elements.filteredTimeCanvas,
                state.filteredSignal,
                state.timeAxis,
                { zoom, color: '#4ecdc4' }
            );
            
            if (state.spectrumType === 'phase') {
                const phase = DSP.computePhaseSpectrum(state.filteredSpectrum);
                Plotter.drawPhaseSpectrum(
                    elements.filteredFreqCanvas,
                    phase,
                    state.freqAxis,
                    { maxFreq: state.sampleRate / 2 }
                );
            } else if (state.spectrumType === 'psd') {
                const psd = DSP.computePSD(state.filteredSpectrum, state.sampleRate, state.currentEnergyGain);
                Plotter.drawFrequencyDomain(
                    elements.filteredFreqCanvas,
                    psd,
                    state.freqAxis,
                    { 
                        logScale: state.logScale, 
                        color: '#ff6b6b',
                        maxFreq: state.sampleRate / 2
                    }
                );
            } else {
                const magnitude = DSP.computeMagnitudeSpectrum(state.filteredSpectrum, state.currentCoherentGain);
                Plotter.drawFrequencyDomain(
                    elements.filteredFreqCanvas,
                    magnitude,
                    state.freqAxis,
                    { 
                        logScale: state.logScale, 
                        color: '#4ecdc4',
                        maxFreq: state.sampleRate / 2
                    }
                );
            }
        }
        
        if (state.showWindowComparison) {
            Plotter.drawWindowComparison(
                elements.windowCompCanvas,
                state.windowFunction
            );
        }
    }

    function updateInfo() {
        const enabledCount = state.components.filter(c => c.enabled).length;
        elements.signalInfo.textContent = 
            `采样率: ${state.sampleRate} Hz | 窗口: ${state.windowSize} 点 | 分量: ${enabledCount}`;
        
        const freqRes = (state.sampleRate / state.windowSize).toFixed(2);
        elements.spectrumInfo.textContent = 
            `频率分辨率: ${freqRes} Hz | 奈奎斯特频率: ${state.sampleRate / 2} Hz`;
    }

    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n');
            const signal = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(/[,;\t\s]+/);
                for (const part of parts) {
                    const num = parseFloat(part);
                    if (!isNaN(num)) {
                        signal.push(num);
                    }
                }
            }
            
            if (signal.length > 0) {
                const originalLength = signal.length;
                
                if (signal.length < 1024) {
                    const padded = new Array(1024).fill(0);
                    for (let i = 0; i < signal.length; i++) {
                        padded[i] = signal[i];
                    }
                    state.importedSignal = padded;
                } else {
                    state.importedSignal = signal.slice();
                }
                
                elements.windowSize.value = Math.min(8192, DSP.nextPowerOf2(state.importedSignal.length));
                state.windowSize = parseInt(elements.windowSize.value);
                
                update();
                alert(`成功导入 ${originalLength} 个采样点数据！`);
            } else {
                alert('无法解析文件内容，请确保是有效的CSV格式。');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function exportSignal() {
        const format = prompt('请输入导出格式：\n1. CSV (时域数据)\n2. PNG (时域图像)', '1');
        
        if (format === '1') {
            let csv = '时间(s),幅度\n';
            for (let i = 0; i < state.currentSignal.length; i++) {
                csv += `${state.timeAxis[i].toFixed(8)},${state.currentSignal[i].toFixed(8)}\n`;
            }
            downloadCSV(csv, 'signal.csv');
        } else if (format === '2') {
            Plotter.canvasToPNG(elements.timeCanvas, 'signal.png');
        }
    }

    function exportSpectrum() {
        const format = prompt('请输入导出格式：\n1. CSV (频谱数据)\n2. PNG (频谱图像)', '1');
        
        if (format === '1') {
            const magnitude = DSP.computeMagnitudeSpectrum(state.currentSpectrum);
            const phase = DSP.computePhaseSpectrum(state.currentSpectrum);
            const psd = DSP.computePSD(state.currentSpectrum, state.sampleRate);
            
            let csv = '频率(Hz),幅度,相位(rad),PSD\n';
            for (let i = 0; i < magnitude.length; i++) {
                csv += `${state.freqAxis[i].toFixed(2)},${magnitude[i].toFixed(8)},${phase[i].toFixed(8)},${psd[i].toFixed(10)}\n`;
            }
            downloadCSV(csv, 'spectrum.csv');
        } else if (format === '2') {
            Plotter.canvasToPNG(elements.freqCanvas, 'spectrum.png');
        }
    }

    function downloadCSV(content, filename) {
        const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    return {
        init,
        addComponent,
        removeComponent,
        updateComponent
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
