const Plotter = (function() {

    function setupCanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        return {
            ctx,
            width: rect.width,
            height: rect.height
        };
    }

    function drawGrid(ctx, width, height, xTicks = 10, yTicks = 5, color = 'rgba(255, 255, 255, 0.1)') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= xTicks; i++) {
            const x = (width / xTicks) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let i = 0; i <= yTicks; i++) {
            const y = (height / yTicks) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    function drawAxisLabels(ctx, width, height, xLabel, yLabel, xValues, yValues) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        if (xValues) {
            for (let i = 0; i < xValues.length; i++) {
                const x = (width / (xValues.length - 1)) * i;
                ctx.fillText(xValues[i].label, x, height - 5);
            }
        }
        
        ctx.textAlign = 'right';
        if (yValues) {
            for (let i = 0; i < yValues.length; i++) {
                const y = (height / (yValues.length - 1)) * i;
                ctx.fillText(yValues[i].label, 40, y + 3);
            }
        }
        
        if (xLabel) {
            ctx.textAlign = 'center';
            ctx.fillText(xLabel, width / 2, height - 5);
        }
    }

    function drawTimeDomain(canvas, signal, timeAxis, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 20, bottom: 25, left: 50 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        drawGrid(ctx, plotWidth, plotHeight, 10, 4);
        
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, plotHeight / 2);
        ctx.lineTo(plotWidth, plotHeight / 2);
        ctx.stroke();
        
        const zoom = options.zoom || 1;
        const visibleSamples = Math.floor(signal.length / zoom);
        const startSample = Math.max(0, Math.floor((signal.length - visibleSamples) / 2));
        const endSample = Math.min(signal.length, startSample + visibleSamples);
        
        let minVal = Infinity, maxVal = -Infinity;
        for (let i = startSample; i < endSample; i++) {
            if (signal[i] < minVal) minVal = signal[i];
            if (signal[i] > maxVal) maxVal = signal[i];
        }
        
        const margin = 0.1;
        const range = Math.max(maxVal - minVal, 0.001) * (1 + 2 * margin);
        const yOffset = -(minVal - (maxVal - minVal) * margin);
        
        ctx.strokeStyle = options.color || '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let i = 0; i < visibleSamples; i++) {
            const sampleIdx = startSample + Math.floor(i * (endSample - startSample) / visibleSamples);
            const x = (i / (visibleSamples - 1)) * plotWidth;
            const y = plotHeight - ((signal[sampleIdx] + yOffset) / range) * plotHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const startTime = timeAxis[startSample];
        const endTime = timeAxis[Math.min(endSample - 1, timeAxis.length - 1)];
        
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            const time = startTime + (endTime - startTime) * (i / 5);
            let label;
            if (time >= 1) {
                label = time.toFixed(2) + 's';
            } else if (time >= 0.001) {
                label = (time * 1000).toFixed(1) + 'ms';
            } else {
                label = (time * 1000000).toFixed(0) + 'μs';
            }
            ctx.fillText(label, x, plotHeight + 18);
        }
        
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const y = (plotHeight / 4) * i;
            const val = (1 - i / 4) * range - yOffset;
            ctx.fillText(val.toFixed(2), -5, y + 3);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = '11px sans-serif';
        ctx.fillText('时间', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-35, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('幅度', 0, 0);
        ctx.restore();
        
        ctx.restore();
        
        return { minVal, maxVal, range };
    }

    function drawFrequencyDomain(canvas, spectrum, freqAxis, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 20, bottom: 35, left: 55 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        drawGrid(ctx, plotWidth, plotHeight, 10, 5);
        
        const isLog = options.logScale !== false;
        const maxFreq = options.maxFreq || freqAxis[freqAxis.length - 1];
        
        let spectrumToPlot = spectrum;
        let freqToPlot = freqAxis;
        const maxIdx = freqAxis.findIndex(f => f >= maxFreq);
        if (maxIdx > 0) {
            spectrumToPlot = spectrum.slice(0, maxIdx);
            freqToPlot = freqAxis.slice(0, maxIdx);
        }
        
        let minVal, maxVal;
        if (isLog) {
            minVal = -100;
            maxVal = 0;
        } else {
            minVal = Infinity;
            maxVal = -Infinity;
            for (let i = 0; i < spectrumToPlot.length; i++) {
                if (spectrumToPlot[i] < minVal) minVal = spectrumToPlot[i];
                if (spectrumToPlot[i] > maxVal) maxVal = spectrumToPlot[i];
            }
            if (maxVal === minVal) {
                maxVal = minVal + 1;
            }
            minVal = minVal - (maxVal - minVal) * 0.1;
            maxVal = maxVal + (maxVal - minVal) * 0.1;
        }
        
        const range = maxVal - minVal;
        const barWidth = Math.max(1, plotWidth / spectrumToPlot.length - 0.5);
        
        ctx.fillStyle = options.color || '#7b2cbf';
        ctx.strokeStyle = options.color || '#7b2cbf';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < spectrumToPlot.length; i++) {
            const x = (i / spectrumToPlot.length) * plotWidth;
            let val = spectrumToPlot[i];
            if (isLog) {
                val = Math.max(minVal, DSP.linearToDb(val));
            }
            const normalizedVal = (val - minVal) / range;
            const barHeight = Math.max(0, normalizedVal * plotHeight);
            const y = plotHeight - barHeight;
            
            ctx.fillRect(x, y, barWidth, barHeight);
        }
        
        if (options.peaks && options.peaks.length > 0) {
            ctx.fillStyle = '#ff6b6b';
            ctx.strokeStyle = '#ff6b6b';
            
            for (const peak of options.peaks) {
                const idx = freqToPlot.findIndex(f => f >= peak.frequency);
                if (idx >= 0 && idx < spectrumToPlot.length) {
                    const x = (idx / spectrumToPlot.length) * plotWidth;
                    let val = spectrumToPlot[idx];
                    if (isLog) {
                        val = Math.max(minVal, DSP.linearToDb(val));
                    }
                    const normalizedVal = (val - minVal) / range;
                    const y = plotHeight - normalizedVal * plotHeight;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.font = '9px sans-serif';
                    ctx.fillStyle = '#ff6b6b';
                    ctx.textAlign = 'center';
                    let freqLabel;
                    if (peak.frequency >= 1000) {
                        freqLabel = (peak.frequency / 1000).toFixed(1) + 'kHz';
                    } else {
                        freqLabel = peak.frequency.toFixed(0) + 'Hz';
                    }
                    ctx.fillText(freqLabel, x, y - 8);
                }
            }
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const displayMaxFreq = freqToPlot[freqToPlot.length - 1];
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            const freq = displayMaxFreq * (i / 5);
            let label;
            if (freq >= 1000) {
                label = (freq / 1000).toFixed(1) + 'k';
            } else {
                label = freq.toFixed(0);
            }
            ctx.fillText(label, x, plotHeight + 18);
        }
        
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = (plotHeight / 5) * i;
            const val = maxVal - range * (i / 5);
            if (isLog) {
                ctx.fillText(val.toFixed(0) + 'dB', -5, y + 3);
            } else {
                ctx.fillText(val.toFixed(2), -5, y + 3);
            }
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = '11px sans-serif';
        ctx.fillText('频率 (Hz)', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-40, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        if (options.ylabel) {
            ctx.fillText(options.ylabel, 0, 0);
        } else if (isLog) {
            ctx.fillText('幅度 (dB)', 0, 0);
        } else {
            ctx.fillText('幅度', 0, 0);
        }
        ctx.restore();
        
        ctx.restore();
        
        return { minVal, maxVal };
    }

    function drawPhaseSpectrum(canvas, phase, freqAxis, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 20, bottom: 35, left: 55 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        drawGrid(ctx, plotWidth, plotHeight, 10, 4);
        
        const maxFreq = options.maxFreq || freqAxis[freqAxis.length - 1];
        const maxIdx = freqAxis.findIndex(f => f >= maxFreq);
        const phaseToPlot = maxIdx > 0 ? phase.slice(0, maxIdx) : phase;
        const freqToPlot = maxIdx > 0 ? freqAxis.slice(0, maxIdx) : freqAxis;
        
        const minVal = -Math.PI;
        const maxVal = Math.PI;
        const range = maxVal - minVal;
        
        ctx.strokeStyle = options.color || '#4ecdc4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let i = 0; i < phaseToPlot.length; i++) {
            const x = (i / phaseToPlot.length) * plotWidth;
            const normalizedVal = (phaseToPlot[i] - minVal) / range;
            const y = plotHeight - normalizedVal * plotHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const displayMaxFreq = freqToPlot[freqToPlot.length - 1];
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            const freq = displayMaxFreq * (i / 5);
            let label;
            if (freq >= 1000) {
                label = (freq / 1000).toFixed(1) + 'k';
            } else {
                label = freq.toFixed(0);
            }
            ctx.fillText(label, x, plotHeight + 18);
        }
        
        ctx.textAlign = 'right';
        const yLabels = ['π', 'π/2', '0', '-π/2', '-π'];
        for (let i = 0; i <= 4; i++) {
            const y = (plotHeight / 4) * i;
            ctx.fillText(yLabels[i], -5, y + 3);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = '11px sans-serif';
        ctx.fillText('频率 (Hz)', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-40, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('相位 (rad)', 0, 0);
        ctx.restore();
        
        ctx.restore();
    }

    function drawWindowComparison(canvas, windowType) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 20, bottom: 35, left: 55 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        const N = 512;
        const windowTypes = ['rectangular', 'hann', 'hamming', 'blackman'];
        const colors = ['#ff6b6b', '#4ecdc4', '#00d4ff', '#7b2cbf'];
        const labels = ['矩形窗', '汉宁窗', '汉明窗', '布莱克曼'];
        
        drawGrid(ctx, plotWidth, plotHeight, 10, 5);
        
        for (let w = 0; w < windowTypes.length; w++) {
            const window = DSP.WindowFunctions.generate(windowTypes[w], N);
            const padded = new Array(N * 4).fill(0);
            for (let i = 0; i < N; i++) {
                padded[i + N * 1.5] = window[i];
            }
            
            const fftResult = DSP.rfft(padded);
            const magnitude = DSP.computeMagnitudeSpectrum(fftResult);
            const dbMagnitude = magnitude.map(v => Math.max(-100, DSP.linearToDb(v)));
            
            const halfLen = Math.floor(dbMagnitude.length / 2);
            const displayData = dbMagnitude.slice(0, halfLen);
            
            ctx.strokeStyle = colors[w];
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = windowTypes[w] === windowType ? 1 : 0.6;
            ctx.beginPath();
            
            for (let i = 0; i < displayData.length; i++) {
                const x = (i / displayData.length) * plotWidth;
                const normalizedVal = (displayData[i] + 100) / 100;
                const y = plotHeight - normalizedVal * plotHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        
        for (let w = 0; w < windowTypes.length; w++) {
            const x = 10 + w * 100;
            ctx.fillStyle = colors[w];
            ctx.fillRect(x, -10, 12, 12);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(labels[w], x + 16, 0);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            const bin = (i / 5) * (N / 2);
            ctx.fillText(bin.toFixed(0), x, plotHeight + 18);
        }
        
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = (plotHeight / 5) * i;
            const db = 0 - 100 * (i / 5);
            ctx.fillText(db.toFixed(0) + 'dB', -5, y + 3);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = '11px sans-serif';
        ctx.fillText('FFT 频点', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-40, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('幅度 (dB)', 0, 0);
        ctx.restore();
        
        ctx.restore();
    }

    function canvasToPNG(canvas, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    return {
        setupCanvas,
        drawGrid,
        drawTimeDomain,
        drawFrequencyDomain,
        drawPhaseSpectrum,
        drawWindowComparison,
        canvasToPNG
    };
})();
