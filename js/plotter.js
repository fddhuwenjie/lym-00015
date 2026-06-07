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
            const coherentGain = DSP.WindowFunctions.getCoherentGain(window);
            const magnitude = DSP.computeMagnitudeSpectrum(fftResult, coherentGain);
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

    function viridisColormap(value) {
        value = Math.max(0, Math.min(1, value));
        
        const r = Math.round(
            0.267 * (1 - value) * (1 - value) * (1 - value) * (1 - value) +
            0.283 * value * value * value * value
        );
        const g = Math.round(
            0.004 * (1 - value) * (1 - value) * (1 - value) * (1 - value) +
            0.963 * value * value * value * value
        );
        const b = Math.round(
            0.329 * (1 - value) * (1 - value) * (1 - value) * (1 - value) +
            0.055 * value * value * value * value
        );
        
        const r2 = Math.round(255 * (
            0.267 * Math.pow(1 - value, 4) +
            0.283 * Math.pow(value, 4)
        ));
        const g2 = Math.round(255 * (
            0.004 * Math.pow(1 - value, 4) +
            0.963 * Math.pow(value, 4)
        ));
        const b2 = Math.round(255 * (
            0.329 * Math.pow(1 - value, 4) +
            0.055 * Math.pow(value, 4)
        ));
        
        if (value < 0.125) {
            const t = value / 0.125;
            return `rgb(${Math.round(68 + t * 0)}, ${Math.round(1 + t * 33)}, ${Math.round(84 + t * 35)})`;
        } else if (value < 0.25) {
            const t = (value - 0.125) / 0.125;
            return `rgb(${Math.round(68 + t * 0)}, ${Math.round(34 + t * 49)}, ${Math.round(119 + t * 29)})`;
        } else if (value < 0.375) {
            const t = (value - 0.25) / 0.125;
            return `rgb(${Math.round(68 + t * 1)}, ${Math.round(83 + t * 59)}, ${Math.round(148 + t * 19)})`;
        } else if (value < 0.5) {
            const t = (value - 0.375) / 0.125;
            return `rgb(${Math.round(69 + t * 21)}, ${Math.round(142 + t * 53)}, ${Math.round(167 + t * 2)})`;
        } else if (value < 0.625) {
            const t = (value - 0.5) / 0.125;
            return `rgb(${Math.round(90 + t * 40)}, ${Math.round(195 + t * 26)}, ${Math.round(169 + t * -22)})`;
        } else if (value < 0.75) {
            const t = (value - 0.625) / 0.125;
            return `rgb(${Math.round(130 + t * 60)}, ${Math.round(221 + t * 19)}, ${Math.round(147 + t * -40)})`;
        } else if (value < 0.875) {
            const t = (value - 0.75) / 0.125;
            return `rgb(${Math.round(190 + t * 44)}, ${Math.round(240 + t * 10)}, ${Math.round(107 + t * -37)})`;
        } else {
            const t = (value - 0.875) / 0.125;
            return `rgb(${Math.round(234 + t * 21)}, ${Math.round(250 + t * 5)}, ${Math.round(70 + t * -15)})`;
        }
    }

    function drawSpectrogram(canvas, stftResult, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 60, bottom: 35, left: 55 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        const { spectrogram, timeAxis, freqAxis, numFrames } = stftResult;
        const freqScale = options.freqScale || 'linear';
        const minDb = options.minDb || -100;
        const maxDb = options.maxDb || 0;
        const maxFreq = options.maxFreq || freqAxis[freqAxis.length - 1];
        
        const maxFreqIdx = freqAxis.findIndex(f => f >= maxFreq);
        const displayFreqs = maxFreqIdx > 0 ? freqAxis.slice(0, maxFreqIdx) : freqAxis;
        
        const numFreqBins = displayFreqs.length;
        
        const imageData = ctx.createImageData(plotWidth, plotHeight);
        const data = imageData.data;
        
        for (let py = 0; py < plotHeight; py++) {
            let freqIdx;
            const normalizedY = 1 - py / plotHeight;
            
            if (freqScale === 'linear') {
                freqIdx = Math.floor(normalizedY * (numFreqBins - 1));
            } else if (freqScale === 'log') {
                const logMin = Math.log10(Math.max(1, displayFreqs[0] || 1));
                const logMax = Math.log10(Math.max(1, displayFreqs[displayFreqs.length - 1]));
                const logFreq = logMin + normalizedY * (logMax - logMin);
                const freq = Math.pow(10, logFreq);
                freqIdx = displayFreqs.findIndex(f => f >= freq);
                if (freqIdx < 0) freqIdx = numFreqBins - 1;
            } else if (freqScale === 'mel') {
                const melMin = DSP.linearToMel(Math.max(0, displayFreqs[0] || 0));
                const melMax = DSP.linearToMel(displayFreqs[displayFreqs.length - 1]);
                const mel = melMin + normalizedY * (melMax - melMin);
                const freq = DSP.melToLinear(mel);
                freqIdx = displayFreqs.findIndex(f => f >= freq);
                if (freqIdx < 0) freqIdx = numFreqBins - 1;
            }
            
            freqIdx = Math.max(0, Math.min(numFreqBins - 1, freqIdx));
            
            for (let px = 0; px < plotWidth; px++) {
                const frameIdx = Math.floor((px / plotWidth) * (numFrames - 1));
                let dbValue = minDb;
                
                if (frameIdx >= 0 && frameIdx < spectrogram.length && freqIdx >= 0 && freqIdx < spectrogram[frameIdx].length) {
                    dbValue = DSP.linearToDb(spectrogram[frameIdx][freqIdx]);
                }
                
                const normalized = Math.max(0, Math.min(1, (dbValue - minDb) / (maxDb - minDb)));
                const colorStr = viridisColormap(normalized);
                const colorMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                
                const pixelIndex = (py * plotWidth + px) * 4;
                if (colorMatch) {
                    data[pixelIndex] = parseInt(colorMatch[1]);
                    data[pixelIndex + 1] = parseInt(colorMatch[2]);
                    data[pixelIndex + 2] = parseInt(colorMatch[3]);
                }
                data[pixelIndex + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        drawGrid(ctx, plotWidth, plotHeight, 10, 5, 'rgba(255, 255, 255, 0.2)');
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const displayMaxTime = timeAxis[timeAxis.length - 1];
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            const time = displayMaxTime * (i / 5);
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
        for (let i = 0; i <= 5; i++) {
            const y = (plotHeight / 5) * i;
            const normalizedY = 1 - i / 5;
            let freq;
            
            if (freqScale === 'linear') {
                freq = displayFreqs[0] + normalizedY * (displayFreqs[displayFreqs.length - 1] - displayFreqs[0]);
            } else if (freqScale === 'log') {
                const logMin = Math.log10(Math.max(1, displayFreqs[0] || 1));
                const logMax = Math.log10(Math.max(1, displayFreqs[displayFreqs.length - 1]));
                freq = Math.pow(10, logMin + normalizedY * (logMax - logMin));
            } else if (freqScale === 'mel') {
                const melMin = DSP.linearToMel(Math.max(0, displayFreqs[0] || 0));
                const melMax = DSP.linearToMel(displayFreqs[displayFreqs.length - 1]);
                freq = DSP.melToLinear(melMin + normalizedY * (melMax - melMin));
            }
            
            let label;
            if (freq >= 1000) {
                label = (freq / 1000).toFixed(1) + 'k';
            } else {
                label = freq.toFixed(0);
            }
            ctx.fillText(label, -5, y + 3);
        }
        
        const colorbarWidth = 20;
        const colorbarX = plotWidth + 20;
        const colorbarHeight = plotHeight;
        
        for (let i = 0; i < colorbarHeight; i++) {
            const value = 1 - i / colorbarHeight;
            ctx.fillStyle = viridisColormap(value);
            ctx.fillRect(colorbarX, i, colorbarWidth, 1);
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(colorbarX, 0, colorbarWidth, colorbarHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'left';
        for (let i = 0; i <= 5; i++) {
            const y = (colorbarHeight / 5) * i;
            const db = maxDb - (maxDb - minDb) * (i / 5);
            ctx.fillText(db.toFixed(0) + 'dB', colorbarX + colorbarWidth + 5, y + 3);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.font = '11px sans-serif';
        ctx.fillText('时间', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-40, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('频率 (Hz)', 0, 0);
        ctx.restore();
        
        ctx.restore();
        
        return {
            padding,
            plotWidth,
            plotHeight,
            timeAxis,
            freqAxis: displayFreqs,
            freqScale
        };
    }

    function drawPoleZeroPlot(canvas, zeros, poles, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 20, right: 20, bottom: 35, left: 35 };
        const plotWidth = Math.max(1, width - padding.left - padding.right);
        const plotHeight = Math.max(1, height - padding.top - padding.bottom);
        const centerX = plotWidth / 2;
        const centerY = plotHeight / 2;
        const radius = Math.max(1, Math.min(plotWidth, plotHeight) / 2 - 20);
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        drawGrid(ctx, plotWidth, plotHeight, 4, 4, 'rgba(255, 255, 255, 0.1)');
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(plotWidth, centerY);
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, plotHeight);
        ctx.stroke();
        
        const toCanvas = (x, y) => ({
            x: centerX + x * radius,
            y: centerY - y * radius
        });
        
        if (zeros) {
            ctx.strokeStyle = options.zeroColor || '#4ecdc4';
            ctx.lineWidth = 2;
            for (const zero of zeros) {
                const pt = toCanvas(zero.real, zero.imag);
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        if (poles) {
            ctx.strokeStyle = options.poleColor || '#ff6b6b';
            ctx.lineWidth = 2;
            for (const pole of poles) {
                const pt = toCanvas(pole.real, pole.imag);
                ctx.beginPath();
                ctx.moveTo(pt.x - 6, pt.y - 6);
                ctx.lineTo(pt.x + 6, pt.y + 6);
                ctx.moveTo(pt.x + 6, pt.y - 6);
                ctx.lineTo(pt.x - 6, pt.y + 6);
                ctx.stroke();
            }
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        const axisLabels = [-1, -0.5, 0, 0.5, 1];
        for (let i = 0; i < axisLabels.length; i++) {
            const x = centerX + axisLabels[i] * radius;
            ctx.fillText(axisLabels[i].toString(), x, plotHeight + 18);
            
            const y = centerY - axisLabels[i] * radius;
            ctx.textAlign = 'right';
            ctx.fillText(axisLabels[i].toString(), centerX - radius - 5, y + 3);
            ctx.textAlign = 'center';
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.fillText('实部 (Re)', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-25, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('虚部 (Im)', 0, 0);
        ctx.restore();
        
        ctx.textAlign = 'left';
        ctx.font = '10px sans-serif';
        ctx.fillStyle = options.zeroColor || '#4ecdc4';
        ctx.fillText('○ 零点', 10, 15);
        ctx.fillStyle = options.poleColor || '#ff6b6b';
        ctx.fillText('× 极点', 10, 30);
        
        ctx.restore();
        
        return {
            centerX,
            centerY,
            radius,
            padding,
            toCanvas
        };
    }

    function drawIIRFreqResponse(canvas, sections, sampleRate, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 20, bottom: 35, left: 55 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const halfHeight = plotHeight / 2 - 10;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(padding.left, padding.top);
        
        const numPoints = options.numPoints || 1024;
        const maxFreq = options.maxFreq || sampleRate / 2;
        const isLogFreq = options.logFreq !== false;
        const isLogAmp = options.logAmp !== false;
        
        const freqPoints = new Array(numPoints);
        const magResponse = new Array(numPoints);
        const phaseResponse = new Array(numPoints);
        
        for (let i = 0; i < numPoints; i++) {
            let freq;
            if (isLogFreq) {
                const logMin = Math.log10(1);
                const logMax = Math.log10(maxFreq);
                freq = Math.pow(10, logMin + (i / (numPoints - 1)) * (logMax - logMin));
            } else {
                freq = (i / (numPoints - 1)) * maxFreq;
            }
            freqPoints[i] = freq;
            
            const response = DSP.computeIIRFreqResponse(sections, freq, sampleRate);
            magResponse[i] = isLogAmp ? DSP.linearToDb(response.magnitude) : response.magnitude;
            phaseResponse[i] = response.phase;
        }
        
        drawGrid(ctx, plotWidth, halfHeight, 10, 4, 'rgba(255, 255, 255, 0.1)');
        
        let minMag, maxMag;
        if (isLogAmp) {
            minMag = options.minDb || -100;
            maxMag = options.maxDb || 10;
        } else {
            minMag = Math.min(...magResponse) * 0.9;
            maxMag = Math.max(...magResponse) * 1.1;
        }
        
        const magRange = maxMag - minMag;
        
        ctx.strokeStyle = options.magColor || '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let i = 0; i < numPoints; i++) {
            let x;
            if (isLogFreq) {
                const logMin = Math.log10(freqPoints[0]);
                const logMax = Math.log10(freqPoints[numPoints - 1]);
                x = (Math.log10(freqPoints[i]) - logMin) / (logMax - logMin) * plotWidth;
            } else {
                x = (i / (numPoints - 1)) * plotWidth;
            }
            
            const val = Math.max(minMag, Math.min(maxMag, magResponse[i]));
            const y = halfHeight - ((val - minMag) / magRange) * halfHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 4; i++) {
            const y = (halfHeight / 4) * i;
            const val = maxMag - magRange * (i / 4);
            if (isLogAmp) {
                ctx.fillText(val.toFixed(0) + 'dB', -5, y + 3);
            } else {
                ctx.fillText(val.toFixed(2), -5, y + 3);
            }
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isLogAmp ? '幅度 (dB)' : '幅度', -30, halfHeight / 2);
        
        ctx.translate(0, halfHeight + 20);
        
        drawGrid(ctx, plotWidth, halfHeight, 10, 4, 'rgba(255, 255, 255, 0.1)');
        
        ctx.strokeStyle = options.phaseColor || '#7b2cbf';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let i = 0; i < numPoints; i++) {
            let x;
            if (isLogFreq) {
                const logMin = Math.log10(freqPoints[0]);
                const logMax = Math.log10(freqPoints[numPoints - 1]);
                x = (Math.log10(freqPoints[i]) - logMin) / (logMax - logMin) * plotWidth;
            } else {
                x = (i / (numPoints - 1)) * plotWidth;
            }
            
            const normalizedVal = (phaseResponse[i] + Math.PI) / (2 * Math.PI);
            const y = halfHeight - normalizedVal * halfHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        
        const phaseLabels = ['π', 'π/2', '0', '-π/2', '-π'];
        for (let i = 0; i <= 4; i++) {
            const y = (halfHeight / 4) * i;
            ctx.fillText(phaseLabels[i], -5, y + 3);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('相位 (rad)', -30, halfHeight / 2);
        
        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            let freq;
            if (isLogFreq) {
                const logMin = Math.log10(freqPoints[0]);
                const logMax = Math.log10(freqPoints[numPoints - 1]);
                freq = Math.pow(10, logMin + (i / 5) * (logMax - logMin));
            } else {
                freq = freqPoints[0] + (i / 5) * (freqPoints[numPoints - 1] - freqPoints[0]);
            }
            
            let label;
            if (freq >= 1000) {
                label = (freq / 1000).toFixed(1) + 'k';
            } else {
                label = freq.toFixed(0);
            }
            ctx.fillText(label, x, halfHeight + 18);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.fillText('频率 (Hz)', plotWidth / 2, halfHeight + 35);
        
        ctx.restore();
    }

    function drawImpulseResponse(canvas, impulse, options = {}) {
        const { ctx, width, height } = setupCanvas(canvas);
        const padding = { top: 15, right: 20, bottom: 35, left: 50 };
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
        
        let minVal = Math.min(...impulse);
        let maxVal = Math.max(...impulse);
        const margin = 0.1;
        const range = Math.max(maxVal - minVal, 0.001) * (1 + 2 * margin);
        const yOffset = -(minVal - (maxVal - minVal) * margin);
        
        const N = impulse.length;
        const barWidth = Math.max(1, plotWidth / N - 1);
        
        ctx.fillStyle = options.color || '#4ecdc4';
        ctx.strokeStyle = options.color || '#4ecdc4';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < N; i++) {
            const x = (i / (N - 1)) * plotWidth;
            const normalizedVal = (impulse[i] + yOffset) / range;
            const y = plotHeight - normalizedVal * plotHeight;
            const centerY = plotHeight - yOffset / range * plotHeight;
            
            if (Math.abs(y - centerY) > 0.5) {
                ctx.fillRect(x - barWidth / 2, Math.min(y, centerY), barWidth, Math.abs(y - centerY));
            }
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        
        for (let i = 0; i <= 5; i++) {
            const x = (plotWidth / 5) * i;
            const sample = Math.floor((i / 5) * (N - 1));
            ctx.fillText(sample.toString(), x, plotHeight + 18);
        }
        
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const y = (plotHeight / 4) * i;
            const val = (1 - i / 4) * range - yOffset;
            ctx.fillText(val.toFixed(2), -5, y + 3);
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('采样点', plotWidth / 2, plotHeight + 35);
        
        ctx.save();
        ctx.translate(-35, plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('幅度', 0, 0);
        ctx.restore();
        
        ctx.restore();
    }

    return {
        setupCanvas,
        drawGrid,
        drawTimeDomain,
        drawFrequencyDomain,
        drawPhaseSpectrum,
        drawWindowComparison,
        canvasToPNG,
        drawSpectrogram,
        drawPoleZeroPlot,
        drawIIRFreqResponse,
        drawImpulseResponse,
        viridisColormap
    };
})();
