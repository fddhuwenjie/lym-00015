const App = (function() {

    let state = {
        activeTab: 'basic',
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
        freqAxis: null,

        stftWindowSize: 512,
        stftOverlap: 50,
        stftHop: 256,
        stftFreqScale: 'linear',
        stftDbRange: 80,
        stftWindowType: 'hann',
        stftShowSlice: true,
        stftResult: null,
        stftHoverTime: 0,
        stftHoverFreq: 0,
        stftSliceFrame: 0,

        iirDesignMode: 'manual',
        iirFilterType: 'lowpass',
        iirOrder: 4,
        iirFc: 1000,
        iirRipple: 1,
        iirStopband: 40,
        iirLogAmp: true,
        iirLogFreq: true,
        iirZeros: [],
        iirPoles: [],
        iirGain: 1,
        iirSections: [],
        iirApplied: false,
        iirFilteredSignal: null,
        iirDragging: null,
        iirDragType: null,

        modemType: 'am',
        modemCarrier: 5000,
        modemIndex: 1,
        modemSideband: 'upper',
        demodType: 'envelope',
        demodSnr: 30,
        demodPllBw: 0.01,
        modemBaseband: null,
        modemModulated: null,
        modemDemodulated: null,
        modemError: null,
        modemModulatedDone: false,
        modemDemodulatedDone: false
    };

    const elements = {};

    function init() {
        cacheElements();
        bindEvents();
        loadDefaultComponents();
        initDefaultIIR();
        update();
        updateSTFT();
        updateIIR();
        
        window.addEventListener('resize', () => updateAll());
    }

    function cacheElements() {
        elements.tabBtns = document.querySelectorAll('.tab-btn');
        elements.tabContents = document.querySelectorAll('.tab-content');

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

        elements.basicControls = document.getElementById('basic-controls');
        elements.basicControls2 = document.getElementById('basic-controls-2');
        elements.basicControls3 = document.getElementById('basic-controls-3');
        elements.basicControls4 = document.getElementById('basic-controls-4');
        elements.basicControls5 = document.getElementById('basic-controls-5');
        elements.stftControls = document.getElementById('stft-controls');
        elements.iirControls = document.getElementById('iir-controls');
        elements.iirCoeffControls = document.getElementById('iir-coeff-controls');
        elements.modemControls = document.getElementById('modem-controls');
        elements.demodControls = document.getElementById('demod-controls');

        elements.stftWindowSize = document.getElementById('stft-window-size');
        elements.stftOverlap = document.getElementById('stft-overlap');
        elements.stftOverlapValue = document.getElementById('stft-overlap-value');
        elements.stftHop = document.getElementById('stft-hop');
        elements.stftFreqScale = document.getElementById('stft-freq-scale');
        elements.stftDbRange = document.getElementById('stft-db-range');
        elements.stftDbRangeValue = document.getElementById('stft-db-range-value');
        elements.stftWindowType = document.getElementById('stft-window-type');
        elements.stftShowSlice = document.getElementById('stft-show-slice');
        elements.stftCanvas = document.getElementById('stft-canvas');
        elements.stftSliceCanvas = document.getElementById('stft-slice-canvas');
        elements.stftTimeCanvas = document.getElementById('stft-time-canvas');
        elements.stftSliceContainer = document.getElementById('stft-slice-container');
        elements.stftInfo = document.getElementById('stft-info');
        elements.stftHoverInfo = document.getElementById('stft-hover-info');
        elements.stftSliceInfo = document.getElementById('stft-slice-info');

        elements.iirDesignMode = document.getElementById('iir-design-mode');
        elements.iirFilterType = document.getElementById('iir-filter-type');
        elements.iirOrder = document.getElementById('iir-order');
        elements.iirOrderValue = document.getElementById('iir-order-value');
        elements.iirFc = document.getElementById('iir-fc');
        elements.iirRipple = document.getElementById('iir-ripple');
        elements.iirStopband = document.getElementById('iir-stopband');
        elements.iirLogAmp = document.getElementById('iir-log-amp');
        elements.iirLogFreq = document.getElementById('iir-log-freq');
        elements.iirRippleGroup = document.getElementById('iir-ripple-group');
        elements.iirStopbandGroup = document.getElementById('iir-stopband-group');
        elements.iirOrderGroup = document.getElementById('iir-order-group');
        elements.iirFcGroup = document.getElementById('iir-fc-group');
        elements.iirGenerateBtn = document.getElementById('iir-generate');
        elements.iirResetBtn = document.getElementById('iir-reset');
        elements.iirApplyBtn = document.getElementById('iir-apply');
        elements.iirPolezeroCanvas = document.getElementById('iir-polezero-canvas');
        elements.iirImpulseCanvas = document.getElementById('iir-impulse-canvas');
        elements.iirFreqCanvas = document.getElementById('iir-freq-canvas');
        elements.iirOriginalCanvas = document.getElementById('iir-original-canvas');
        elements.iirFilteredCanvas = document.getElementById('iir-filtered-canvas');
        elements.iirAppliedContainer = document.getElementById('iir-applied-container');
        elements.iirZpkInfo = document.getElementById('iir-zpk-info');
        elements.iirFreqInfo = document.getElementById('iir-freq-info');
        elements.iirSectionsDiv = document.getElementById('iir-sections');
        elements.iirAddSectionBtn = document.getElementById('iir-add-section');

        elements.modemType = document.getElementById('modem-type');
        elements.modemCarrier = document.getElementById('modem-carrier');
        elements.modemIndex = document.getElementById('modem-index');
        elements.modemIndexValue = document.getElementById('modem-index-value');
        elements.modemSideband = document.getElementById('modem-sideband');
        elements.modemSidebandGroup = document.getElementById('modem-sideband-group');
        elements.demodType = document.getElementById('demod-type');
        elements.demodSnr = document.getElementById('demod-snr');
        elements.demodSnrValue = document.getElementById('demod-snr-value');
        elements.demodPllBw = document.getElementById('demod-pll-bw');
        elements.demodPllBwValue = document.getElementById('demod-pll-bw-value');
        elements.demodPllGroup = document.getElementById('demod-pll-group');
        elements.modemModulateBtn = document.getElementById('modem-modulate');
        elements.modemDemodulateBtn = document.getElementById('modem-demodulate');
        elements.modemBasebandCanvas = document.getElementById('modem-baseband-canvas');
        elements.modemModulatedTimeCanvas = document.getElementById('modem-modulated-time-canvas');
        elements.modemModulatedFreqCanvas = document.getElementById('modem-modulated-freq-canvas');
        elements.demodOriginalCanvas = document.getElementById('demod-original-canvas');
        elements.demodRecoveredCanvas = document.getElementById('demod-recovered-canvas');
        elements.demodContainer = document.getElementById('demod-container');
        elements.errorInfo = document.getElementById('error-info');
        elements.modemTimeInfo = document.getElementById('modem-time-info');
        elements.modemFreqInfo = document.getElementById('modem-freq-info');
    }

    function bindEvents() {
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        elements.btnAddComponent.addEventListener('click', addComponent);
        elements.sampleRate.addEventListener('change', () => {
            state.sampleRate = parseInt(elements.sampleRate.value);
            updateAll();
        });
        elements.windowSize.addEventListener('change', () => {
            state.windowSize = parseInt(elements.windowSize.value);
            updateAll();
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

        elements.stftWindowSize.addEventListener('change', () => {
            state.stftWindowSize = parseInt(elements.stftWindowSize.value);
            updateSTFTHop();
            updateSTFT();
        });
        elements.stftOverlap.addEventListener('input', () => {
            state.stftOverlap = parseFloat(elements.stftOverlap.value);
            elements.stftOverlapValue.textContent = state.stftOverlap + '%';
            updateSTFTHop();
            updateSTFT();
        });
        elements.stftFreqScale.addEventListener('change', () => {
            state.stftFreqScale = elements.stftFreqScale.value;
            updateSTFT();
        });
        elements.stftDbRange.addEventListener('input', () => {
            state.stftDbRange = parseInt(elements.stftDbRange.value);
            elements.stftDbRangeValue.textContent = state.stftDbRange + ' dB';
            updateSTFT();
        });
        elements.stftWindowType.addEventListener('change', () => {
            state.stftWindowType = elements.stftWindowType.value;
            updateSTFT();
        });
        elements.stftShowSlice.addEventListener('change', () => {
            state.stftShowSlice = elements.stftShowSlice.checked;
            elements.stftSliceContainer.style.display = state.stftShowSlice ? 'block' : 'none';
            updateSTFT();
        });
        elements.stftCanvas.addEventListener('mousemove', handleSTFTHover);
        elements.stftCanvas.addEventListener('mouseleave', () => {
            elements.stftHoverInfo.textContent = '';
        });
        elements.stftCanvas.addEventListener('click', handleSTFTClick);

        elements.iirDesignMode.addEventListener('change', () => {
            state.iirDesignMode = elements.iirDesignMode.value;
            updateIIRControlsVisibility();
        });
        elements.iirFilterType.addEventListener('change', () => {
            state.iirFilterType = elements.iirFilterType.value;
        });
        elements.iirOrder.addEventListener('input', () => {
            state.iirOrder = parseInt(elements.iirOrder.value);
            elements.iirOrderValue.textContent = state.iirOrder;
        });
        elements.iirFc.addEventListener('change', () => {
            state.iirFc = parseFloat(elements.iirFc.value);
        });
        elements.iirRipple.addEventListener('change', () => {
            state.iirRipple = parseFloat(elements.iirRipple.value);
        });
        elements.iirStopband.addEventListener('change', () => {
            state.iirStopband = parseFloat(elements.iirStopband.value);
        });
        elements.iirLogAmp.addEventListener('change', () => {
            state.iirLogAmp = elements.iirLogAmp.checked;
            updateIIR();
        });
        elements.iirLogFreq.addEventListener('change', () => {
            state.iirLogFreq = elements.iirLogFreq.checked;
            updateIIR();
        });
        elements.iirGenerateBtn.addEventListener('click', generateIIRFilter);
        elements.iirResetBtn.addEventListener('click', initDefaultIIR);
        elements.iirApplyBtn.addEventListener('click', applyIIRFilter);
        elements.iirPolezeroCanvas.addEventListener('mousedown', handleIIRMouseDown);
        window.addEventListener('mousemove', handleIIRMouseMove);
        window.addEventListener('mouseup', handleIIRMouseUp);
        elements.iirAddSectionBtn.addEventListener('click', addIIRSection);

        elements.modemType.addEventListener('change', () => {
            state.modemType = elements.modemType.value;
            elements.modemSidebandGroup.style.display = state.modemType === 'ssb' ? 'block' : 'none';
        });
        elements.modemCarrier.addEventListener('change', () => {
            state.modemCarrier = parseFloat(elements.modemCarrier.value);
        });
        elements.modemIndex.addEventListener('input', () => {
            state.modemIndex = parseFloat(elements.modemIndex.value);
            elements.modemIndexValue.textContent = state.modemIndex.toFixed(1);
        });
        elements.modemSideband.addEventListener('change', () => {
            state.modemSideband = elements.modemSideband.value;
        });
        elements.demodType.addEventListener('change', () => {
            state.demodType = elements.demodType.value;
            elements.demodPllGroup.style.display = state.demodType === 'pll' ? 'block' : 'none';
        });
        elements.demodSnr.addEventListener('input', () => {
            state.demodSnr = parseFloat(elements.demodSnr.value);
            elements.demodSnrValue.textContent = state.demodSnr + ' dB';
        });
        elements.demodPllBw.addEventListener('input', () => {
            state.demodPllBw = parseFloat(elements.demodPllBw.value);
            elements.demodPllBwValue.textContent = state.demodPllBw.toFixed(3);
        });
        elements.modemModulateBtn.addEventListener('click', performModulation);
        elements.modemDemodulateBtn.addEventListener('click', performDemodulation);
    }

    function switchTab(tabName) {
        state.activeTab = tabName;
        
        elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        elements.tabContents.forEach(content => {
            content.style.display = content.id === `tab-${tabName}` ? 'block' : 'none';
        });

        const basicControls = [elements.basicControls, elements.basicControls2, elements.basicControls3, 
                               elements.basicControls4, elements.basicControls5];
        const stftControls = [elements.stftControls];
        const iirControls = [elements.iirControls, elements.iirCoeffControls];
        const modemControls = [elements.modemControls, elements.demodControls];

        basicControls.forEach(el => el.style.display = (tabName === 'basic' || tabName === 'stft' || tabName === 'iir' || tabName === 'modem') ? 'block' : 'none');
        stftControls.forEach(el => el.style.display = tabName === 'stft' ? 'block' : 'none');
        iirControls.forEach(el => el.style.display = tabName === 'iir' ? 'block' : 'none');
        modemControls.forEach(el => el.style.display = tabName === 'modem' ? 'block' : 'none');

        updateAll();
    }

    function updateSTFTHop() {
        state.stftHop = Math.floor(state.stftWindowSize * (1 - state.stftOverlap / 100));
        elements.stftHop.value = state.stftHop;
    }

    function updateIIRControlsVisibility() {
        const mode = state.iirDesignMode;
        const showParams = mode !== 'manual';
        
        elements.iirOrderGroup.style.display = showParams ? 'block' : 'none';
        elements.iirFcGroup.style.display = showParams ? 'block' : 'none';
        elements.iirRippleGroup.style.display = (mode === 'chebyshev1' || mode === 'elliptic') ? 'block' : 'none';
        elements.iirStopbandGroup.style.display = (mode === 'chebyshev2' || mode === 'elliptic') ? 'block' : 'none';
        elements.iirGenerateBtn.style.display = showParams ? 'block' : 'none';
    }

    function loadDefaultComponents() {
        state.components = SignalGenerator.getDefaultComponents();
        state.importedSignal = null;
        renderComponents();
        updateAll();
    }

    function addComponent() {
        const comp = SignalGenerator.createComponent();
        state.components.push(comp);
        renderComponents();
        updateAll();
    }

    function removeComponent(id) {
        state.components = state.components.filter(c => c.id !== id);
        renderComponents();
        updateAll();
    }

    function updateComponent(id, field, value) {
        const comp = state.components.find(c => c.id === id);
        if (comp) {
            comp[field] = value;
            updateAll();
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

    function generateLongSignal(length = 8192) {
        if (state.importedSignal) {
            return state.importedSignal.slice(0, length);
        }
        return SignalGenerator.generateSignal(
            state.components,
            state.sampleRate,
            length
        );
    }

    function updateAll() {
        update();
        if (state.activeTab === 'stft') {
            updateSTFT();
        }
        if (state.activeTab === 'iir') {
            updateIIR();
        }
        if (state.activeTab === 'modem') {
            updateModem();
        }
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

    function updateSTFT() {
        const longSignal = generateLongSignal(8192);
        const stftResult = DSP.stft(
            longSignal,
            state.stftWindowSize,
            state.stftHop,
            state.stftWindowType,
            state.sampleRate
        );
        
        state.stftResult = stftResult;
        state.stftLongSignal = longSignal;
        state.stftTimeAxis = DSP.generateTimeAxis(longSignal.length, state.sampleRate);

        const plotInfo = Plotter.drawSpectrogram(
            elements.stftCanvas,
            stftResult,
            {
                freqScale: state.stftFreqScale,
                minDb: -state.stftDbRange,
                maxDb: 0,
                maxFreq: state.sampleRate / 2
            }
        );
        state.stftPlotInfo = plotInfo;

        const timeZoom = state.timeZoom / 10;
        Plotter.drawTimeDomain(
            elements.stftTimeCanvas,
            longSignal,
            state.stftTimeAxis,
            { zoom: timeZoom, color: '#00d4ff' }
        );

        if (state.stftShowSlice) {
            const sliceFrame = Math.min(state.stftSliceFrame, stftResult.numFrames - 1);
            const sliceData = stftResult.spectrogram[sliceFrame];
            const sliceDb = sliceData.map(v => DSP.linearToDb(v));
            
            const freqAxis = DSP.generateFrequencyAxis(state.stftWindowSize, state.sampleRate);
            const halfLen = Math.floor(freqAxis.length);
            
            Plotter.drawFrequencyDomain(
                elements.stftSliceCanvas,
                sliceData,
                freqAxis.slice(0, halfLen),
                {
                    logScale: true,
                    color: '#ff6b6b',
                    maxFreq: state.sampleRate / 2
                }
            );

            const timePoint = stftResult.timeAxis[sliceFrame];
            elements.stftSliceInfo.textContent = `时间: ${timePoint.toFixed(4)}s | 帧: ${sliceFrame}/${stftResult.numFrames - 1}`;
        }

        elements.stftInfo.textContent = 
            `窗长: ${state.stftWindowSize} | 重叠: ${state.stftOverlap}% | 跳长: ${state.stftHop} | 帧数: ${stftResult.numFrames}`;
    }

    function handleSTFTHover(e) {
        if (!state.stftResult || !state.stftPlotInfo) return;
        
        const rect = elements.stftCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - state.stftPlotInfo.padding.left;
        const y = e.clientY - rect.top - state.stftPlotInfo.padding.top;
        
        if (x < 0 || x > state.stftPlotInfo.plotWidth || y < 0 || y > state.stftPlotInfo.plotHeight) {
            elements.stftHoverInfo.textContent = '';
            return;
        }
        
        const frameIdx = Math.floor((x / state.stftPlotInfo.plotWidth) * (state.stftResult.numFrames - 1));
        const normalizedY = 1 - y / state.stftPlotInfo.plotHeight;
        
        let freq;
        const { freqAxis, freqScale } = state.stftPlotInfo;
        
        if (freqScale === 'linear') {
            freq = freqAxis[0] + normalizedY * (freqAxis[freqAxis.length - 1] - freqAxis[0]);
        } else if (freqScale === 'log') {
            const logMin = Math.log10(Math.max(1, freqAxis[0] || 1));
            const logMax = Math.log10(Math.max(1, freqAxis[freqAxis.length - 1]));
            freq = Math.pow(10, logMin + normalizedY * (logMax - logMin));
        } else if (freqScale === 'mel') {
            const melMin = DSP.linearToMel(Math.max(0, freqAxis[0] || 0));
            const melMax = DSP.linearToMel(freqAxis[freqAxis.length - 1]);
            freq = DSP.melToLinear(melMin + normalizedY * (melMax - melMin));
        }
        
        const time = state.stftResult.timeAxis[Math.min(frameIdx, state.stftResult.timeAxis.length - 1)];
        let dbValue = -state.stftDbRange;
        
        if (frameIdx >= 0 && frameIdx < state.stftResult.spectrogram.length) {
            const freqIdx = Math.floor(normalizedY * (state.stftResult.freqAxis.length - 1));
            if (freqIdx >= 0 && freqIdx < state.stftResult.spectrogram[frameIdx].length) {
                dbValue = DSP.linearToDb(state.stftResult.spectrogram[frameIdx][freqIdx]);
            }
        }
        
        elements.stftHoverInfo.textContent = 
            `t=${time.toFixed(4)}s | f=${freq.toFixed(1)}Hz | ${dbValue.toFixed(1)}dB`;
    }

    function handleSTFTClick(e) {
        if (!state.stftResult || !state.stftPlotInfo) return;
        
        const rect = elements.stftCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - state.stftPlotInfo.padding.left;
        
        if (x >= 0 && x <= state.stftPlotInfo.plotWidth) {
            state.stftSliceFrame = Math.floor((x / state.stftPlotInfo.plotWidth) * (state.stftResult.numFrames - 1));
            updateSTFT();
        }
    }

    function initDefaultIIR() {
        state.iirZeros = [];
        state.iirPoles = [
            new DSP.Complex(0.8, 0.3),
            new DSP.Complex(0.8, -0.3),
            new DSP.Complex(0.6, 0.5),
            new DSP.Complex(0.6, -0.5)
        ];
        state.iirGain = 1;
        state.iirSections = [{
            b0: 1, b1: 0, b2: 0,
            a0: 1, a1: -1.6, a2: 0.73
        }, {
            b0: 1, b1: 0, b2: 0,
            a0: 1, a1: -1.2, a2: 0.61
        }];
        state.iirApplied = false;
        renderIIRSections();
        updateIIR();
    }

    function generateIIRFilter() {
        let design;
        
        switch (state.iirDesignMode) {
            case 'butterworth':
                design = DSP.designButterworth(state.iirOrder, state.iirFc, state.sampleRate, state.iirFilterType);
                break;
            case 'chebyshev1':
                design = DSP.designChebyshev1(state.iirOrder, state.iirFc, state.sampleRate, state.iirRipple, state.iirFilterType);
                break;
            case 'chebyshev2':
                design = DSP.designChebyshev2(state.iirOrder, state.iirFc, state.sampleRate, state.iirStopband, state.iirFilterType);
                break;
            case 'elliptic':
                design = DSP.designElliptic(state.iirOrder, state.iirFc, state.sampleRate, state.iirRipple, state.iirStopband, state.iirFilterType);
                break;
            default:
                return;
        }
        
        state.iirZeros = design.zeros;
        state.iirPoles = design.poles;
        state.iirGain = design.gain;
        state.iirSections = design.sos;
        state.iirApplied = false;
        
        renderIIRSections();
        updateIIR();
    }

    function renderIIRSections() {
        elements.iirSectionsDiv.innerHTML = '';
        
        state.iirSections.forEach((section, idx) => {
            const div = document.createElement('div');
            div.className = 'sos-section';
            
            div.innerHTML = `
                <div class="sos-section-header">
                    <span>双二阶 ${idx + 1}</span>
                    <button class="btn btn-danger" onclick="App.removeIIRSection(${idx})" style="padding: 2px 8px; font-size: 11px;">删除</button>
                </div>
                <div class="sos-coeffs">
                    <div class="form-group">
                        <label>b0</label>
                        <input type="number" step="0.0001" value="${section.b0.toFixed(6)}" 
                               onchange="App.updateIIRCoeff(${idx}, 'b0', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>b1</label>
                        <input type="number" step="0.0001" value="${section.b1.toFixed(6)}" 
                               onchange="App.updateIIRCoeff(${idx}, 'b1', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>b2</label>
                        <input type="number" step="0.0001" value="${section.b2.toFixed(6)}" 
                               onchange="App.updateIIRCoeff(${idx}, 'b2', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>a0</label>
                        <input type="number" step="0.0001" value="${section.a0.toFixed(6)}" 
                               onchange="App.updateIIRCoeff(${idx}, 'a0', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>a1</label>
                        <input type="number" step="0.0001" value="${section.a1.toFixed(6)}" 
                               onchange="App.updateIIRCoeff(${idx}, 'a1', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>a2</label>
                        <input type="number" step="0.0001" value="${section.a2.toFixed(6)}" 
                               onchange="App.updateIIRCoeff(${idx}, 'a2', parseFloat(this.value))">
                    </div>
                </div>
            `;
            
            elements.iirSectionsDiv.appendChild(div);
        });
    }

    function addIIRSection() {
        state.iirSections.push({
            b0: 1, b1: 0, b2: 0,
            a0: 1, a1: 0, a2: 0
        });
        
        const zpk = DSP.sosToZPK(state.iirSections);
        state.iirZeros = zpk.zeros;
        state.iirPoles = zpk.poles;
        state.iirGain = zpk.gain;
        
        renderIIRSections();
        updateIIR();
    }

    function removeIIRSection(idx) {
        if (state.iirSections.length <= 1) return;
        state.iirSections.splice(idx, 1);
        
        const zpk = DSP.sosToZPK(state.iirSections);
        state.iirZeros = zpk.zeros;
        state.iirPoles = zpk.poles;
        state.iirGain = zpk.gain;
        
        renderIIRSections();
        updateIIR();
    }

    function updateIIRCoeff(sectionIdx, coeffName, value) {
        state.iirSections[sectionIdx][coeffName] = value;
        
        const zpk = DSP.sosToZPK(state.iirSections);
        state.iirZeros = zpk.zeros;
        state.iirPoles = zpk.poles;
        state.iirGain = zpk.gain;
        
        updateIIR();
    }

    function applyIIRFilter() {
        if (state.iirSections.length === 0) return;
        
        const rawSignal = generateSignal();
        state.iirFilteredSignal = DSP.applyIIRFilter(rawSignal, state.iirSections);
        state.iirApplied = true;
        updateIIR();
    }

    function updateIIR() {
        const zpkInfo = Plotter.drawPoleZeroPlot(
            elements.iirPolezeroCanvas,
            state.iirZeros,
            state.iirPoles
        );
        state.iirZpkPlotInfo = zpkInfo;

        if (state.iirSections.length > 0) {
            Plotter.drawIIRFreqResponse(
                elements.iirFreqCanvas,
                state.iirSections,
                state.sampleRate,
                {
                    logAmp: state.iirLogAmp,
                    logFreq: state.iirLogFreq,
                    minDb: -100,
                    maxDb: 10
                }
            );

            const impulse = DSP.computeIIRImpulseResponse(state.iirSections, 128);
            Plotter.drawImpulseResponse(
                elements.iirImpulseCanvas,
                impulse
            );
        }

        elements.iirZpkInfo.textContent = 
            `零点: ${state.iirZeros.length} | 极点: ${state.iirPoles.length} | 级联: ${state.iirSections.length} 节`;
        
        elements.iirFreqInfo.textContent = 
            state.iirLogAmp ? '幅度: dB 刻度' : '幅度: 线性刻度';

        if (state.iirApplied && state.iirFilteredSignal && state.currentSignal) {
            elements.iirAppliedContainer.style.display = 'block';
            const zoom = state.timeZoom / 10;
            
            Plotter.drawTimeDomain(
                elements.iirOriginalCanvas,
                state.currentSignal,
                state.timeAxis,
                { zoom, color: '#00d4ff' }
            );
            
            Plotter.drawTimeDomain(
                elements.iirFilteredCanvas,
                state.iirFilteredSignal,
                state.timeAxis,
                { zoom, color: '#4ecdc4' }
            );
        } else {
            elements.iirAppliedContainer.style.display = 'none';
        }
    }

    function handleIIRMouseDown(e) {
        if (!state.iirZpkPlotInfo || state.iirDesignMode !== 'manual') return;
        
        const rect = elements.iirPolezeroCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - state.iirZpkPlotInfo.padding.left;
        const y = e.clientY - rect.top - state.iirZpkPlotInfo.padding.top;
        
        const plotX = (x - state.iirZpkPlotInfo.centerX) / state.iirZpkPlotInfo.radius;
        const plotY = (state.iirZpkPlotInfo.centerY - y) / state.iirZpkPlotInfo.radius;
        
        const hitRadius = 0.15;
        
        for (let i = 0; i < state.iirPoles.length; i++) {
            const pole = state.iirPoles[i];
            const dx = pole.real - plotX;
            const dy = pole.imag - plotY;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                state.iirDragging = i;
                state.iirDragType = 'pole';
                elements.iirPolezeroCanvas.classList.add('pole-zero-dragging');
                return;
            }
        }
        
        for (let i = 0; i < state.iirZeros.length; i++) {
            const zero = state.iirZeros[i];
            const dx = zero.real - plotX;
            const dy = zero.imag - plotY;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                state.iirDragging = i;
                state.iirDragType = 'zero';
                elements.iirPolezeroCanvas.classList.add('pole-zero-dragging');
                return;
            }
        }
    }

    function handleIIRMouseMove(e) {
        if (state.iirDragging === null || !state.iirZpkPlotInfo) return;
        
        const rect = elements.iirPolezeroCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - state.iirZpkPlotInfo.padding.left;
        const y = e.clientY - rect.top - state.iirZpkPlotInfo.padding.top;
        
        let plotX = (x - state.iirZpkPlotInfo.centerX) / state.iirZpkPlotInfo.radius;
        let plotY = (state.iirZpkPlotInfo.centerY - y) / state.iirZpkPlotInfo.radius;
        
        const mag = Math.sqrt(plotX * plotX + plotY * plotY);
        if (mag > 0.99) {
            plotX = plotX / mag * 0.99;
            plotY = plotY / mag * 0.99;
        }
        
        if (state.iirDragType === 'pole') {
            const idx = state.iirDragging;
            const pole = state.iirPoles[idx];
            
            if (Math.abs(pole.imag) > 1e-6) {
                const isConj = idx % 2 === 1;
                const otherIdx = isConj ? idx - 1 : idx + 1;
                if (otherIdx >= 0 && otherIdx < state.iirPoles.length) {
                    state.iirPoles[idx] = new DSP.Complex(plotX, plotY);
                    state.iirPoles[otherIdx] = new DSP.Complex(plotX, -plotY);
                }
            } else {
                state.iirPoles[idx] = new DSP.Complex(plotX, 0);
            }
        } else if (state.iirDragType === 'zero') {
            const idx = state.iirDragging;
            const zero = state.iirZeros[idx];
            
            if (Math.abs(zero.imag) > 1e-6) {
                const isConj = idx % 2 === 1;
                const otherIdx = isConj ? idx - 1 : idx + 1;
                if (otherIdx >= 0 && otherIdx < state.iirZeros.length) {
                    state.iirZeros[idx] = new DSP.Complex(plotX, plotY);
                    state.iirZeros[otherIdx] = new DSP.Complex(plotX, -plotY);
                }
            } else {
                state.iirZeros[idx] = new DSP.Complex(plotX, 0);
            }
        }
        
        const sos = DSP.zpkToSOS(state.iirZeros, state.iirPoles, state.iirGain);
        state.iirSections = sos;
        renderIIRSections();
        updateIIR();
    }

    function handleIIRMouseUp() {
        if (state.iirDragging !== null) {
            state.iirDragging = null;
            state.iirDragType = null;
            elements.iirPolezeroCanvas.classList.remove('pole-zero-dragging');
        }
    }

    function updateModem() {
        const baseband = generateSignal();
        state.modemBaseband = DSP.normalizeSignal(baseband);
        state.modemBasebandAxis = DSP.generateTimeAxis(baseband.length, state.sampleRate);
        
        const window = DSP.WindowFunctions.generate('hann', baseband.length);
        const coherentGain = DSP.WindowFunctions.getCoherentGain(window);

        Plotter.drawTimeDomain(
            elements.modemBasebandCanvas,
            state.modemBaseband,
            state.modemBasebandAxis,
            { color: '#00d4ff' }
        );

        if (state.modemModulatedDone && state.modemModulated) {
            Plotter.drawTimeDomain(
                elements.modemModulatedTimeCanvas,
                state.modemModulated,
                state.modemBasebandAxis,
                { color: '#ff6b6b' }
            );

            const windowed = DSP.WindowFunctions.apply(state.modemModulated, window);
            const fftResult = DSP.rfft(windowed);
            const magnitude = DSP.computeMagnitudeSpectrum(fftResult, coherentGain);
            
            const freqAxis = DSP.generateFrequencyAxis(state.modemModulated.length, state.sampleRate);
            Plotter.drawFrequencyDomain(
                elements.modemModulatedFreqCanvas,
                magnitude,
                freqAxis,
                {
                    logScale: true,
                    color: '#7b2cbf',
                    maxFreq: state.sampleRate / 2
                }
            );

            elements.modemTimeInfo.textContent = `载波: ${state.modemCarrier}Hz | 调制度: ${state.modemIndex}`;
            elements.modemFreqInfo.textContent = `调制类型: ${state.modemType.toUpperCase()}`;
        }

        if (state.modemDemodulatedDone && state.modemDemodulated) {
            elements.demodContainer.style.display = 'block';
            
            Plotter.drawTimeDomain(
                elements.demodOriginalCanvas,
                state.modemBaseband,
                state.modemBasebandAxis,
                { color: '#00d4ff' }
            );
            
            Plotter.drawTimeDomain(
                elements.demodRecoveredCanvas,
                state.modemDemodulated,
                state.modemBasebandAxis,
                { color: '#4ecdc4' }
            );

            if (state.modemError) {
                elements.errorInfo.innerHTML = `
                    <p>均方误差 (MSE): <span>${state.modemError.mse.toExponential(4)}</span></p>
                    <p>恢复信噪比 (SNR): <span>${state.modemError.snrDb.toFixed(2)} dB</span></p>
                    <p>原始信号功率: <span>${state.modemError.signalPower.toExponential(4)}</span></p>
                    <p>误差功率: <span>${state.modemError.errorPower.toExponential(4)}</span></p>
                `;
            }
        }
    }

    function performModulation() {
        if (!state.modemBaseband) return;
        
        const message = state.modemBaseband;
        const fc = state.modemCarrier;
        const fs = state.sampleRate;
        const mi = state.modemIndex;
        
        switch (state.modemType) {
            case 'am':
                state.modemModulated = DSP.amplitudeModulate(message, fc, fs, mi);
                break;
            case 'dsb-sc':
                state.modemModulated = DSP.dsbScModulate(message, fc, fs);
                break;
            case 'ssb':
                state.modemModulated = DSP.ssbModulate(message, fc, fs, state.modemSideband);
                break;
            case 'fm':
                state.modemModulated = DSP.frequencyModulate(message, fc, fs, mi);
                break;
            case 'pm':
                state.modemModulated = DSP.phaseModulate(message, fc, fs, mi);
                break;
        }
        
        state.modemModulatedDone = true;
        state.modemDemodulatedDone = false;
        elements.demodContainer.style.display = 'none';
        updateModem();
    }

    function performDemodulation() {
        if (!state.modemModulated) return;
        
        const received = DSP.addNoise(state.modemModulated, state.demodSnr);
        const fc = state.modemCarrier;
        const fs = state.sampleRate;
        
        let recovered;
        
        switch (state.demodType) {
            case 'envelope':
                recovered = DSP.envelopeDetector(received, fs);
                break;
            case 'coherent':
                recovered = DSP.coherentDemodulate(received, fc, fs);
                break;
            case 'pll':
                recovered = DSP.pllDemodulate(received, fc, fs, state.demodPllBw);
                break;
        }
        
        state.modemDemodulated = DSP.normalizeSignal(recovered);
        state.modemError = DSP.computeErrorPower(state.modemBaseband, state.modemDemodulated);
        state.modemDemodulatedDone = true;
        updateModem();
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
                
                updateAll();
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
        updateComponent,
        removeIIRSection,
        updateIIRCoeff
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
