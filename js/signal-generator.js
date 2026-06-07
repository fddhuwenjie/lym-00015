const SignalGenerator = (function() {

    const WaveformTypes = {
        SINE: 'sine',
        SQUARE: 'square',
        SAWTOOTH: 'sawtooth',
        TRIANGLE: 'triangle',
        NOISE: 'noise'
    };

    function gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function generateSine(n, sampleRate, frequency, amplitude, phase) {
        const t = n / sampleRate;
        const omega = 2 * Math.PI * frequency;
        return amplitude * Math.sin(omega * t + phase);
    }

    function generateSquare(n, sampleRate, frequency, amplitude, phase) {
        const t = n / sampleRate;
        const period = 1 / frequency;
        const position = ((t + phase / (2 * Math.PI * frequency)) % period + period) % period;
        return position < period / 2 ? amplitude : -amplitude;
    }

    function generateSawtooth(n, sampleRate, frequency, amplitude, phase) {
        const t = n / sampleRate;
        const period = 1 / frequency;
        const position = ((t + phase / (2 * Math.PI * frequency)) % period + period) % period;
        return amplitude * (2 * (position / period) - 1);
    }

    function generateTriangle(n, sampleRate, frequency, amplitude, phase) {
        const t = n / sampleRate;
        const period = 1 / frequency;
        const position = ((t + phase / (2 * Math.PI * frequency)) % period + period) % period;
        const normalized = position / period;
        
        if (normalized < 0.25) {
            return amplitude * (4 * normalized);
        } else if (normalized < 0.75) {
            return amplitude * (2 - 4 * normalized);
        } else {
            return amplitude * (4 * normalized - 4);
        }
    }

    let noiseBuffer = null;
    let noiseIndex = 0;

    function pregenerateNoise(length) {
        noiseBuffer = new Array(length);
        for (let i = 0; i < length; i++) {
            noiseBuffer[i] = gaussianRandom();
        }
        noiseIndex = 0;
    }

    function generateNoise(amplitude) {
        if (!noiseBuffer) {
            return amplitude * gaussianRandom();
        }
        const value = noiseBuffer[noiseIndex % noiseBuffer.length];
        noiseIndex++;
        return amplitude * value;
    }

    function generateWaveform(type, n, sampleRate, frequency, amplitude, phase) {
        switch (type) {
            case WaveformTypes.SINE:
                return generateSine(n, sampleRate, frequency, amplitude, phase);
            case WaveformTypes.SQUARE:
                return generateSquare(n, sampleRate, frequency, amplitude, phase);
            case WaveformTypes.SAWTOOTH:
                return generateSawtooth(n, sampleRate, frequency, amplitude, phase);
            case WaveformTypes.TRIANGLE:
                return generateTriangle(n, sampleRate, frequency, amplitude, phase);
            case WaveformTypes.NOISE:
                return generateNoise(amplitude);
            default:
                return 0;
        }
    }

    function generateSignal(components, sampleRate, length) {
        pregenerateNoise(length * 2);
        
        const signal = new Array(length).fill(0);
        
        for (let n = 0; n < length; n++) {
            for (const comp of components) {
                if (!comp.enabled) continue;
                
                const value = generateWaveform(
                    comp.type,
                    n,
                    sampleRate,
                    comp.frequency,
                    comp.amplitude,
                    comp.phase
                );
                signal[n] += value;
            }
        }
        
        return signal;
    }

    function getWaveformTypeName(type) {
        const names = {
            [WaveformTypes.SINE]: '正弦波',
            [WaveformTypes.SQUARE]: '方波',
            [WaveformTypes.SAWTOOTH]: '锯齿波',
            [WaveformTypes.TRIANGLE]: '三角波',
            [WaveformTypes.NOISE]: '白噪声'
        };
        return names[type] || type;
    }

    function createComponent(overrides = {}) {
        return {
            id: Date.now() + Math.random(),
            type: overrides.type || WaveformTypes.SINE,
            frequency: overrides.frequency || 440,
            amplitude: overrides.amplitude || 0.5,
            phase: overrides.phase || 0,
            enabled: overrides.enabled !== undefined ? overrides.enabled : true
        };
    }

    function getDefaultComponents() {
        return [
            createComponent({ type: WaveformTypes.SINE, frequency: 440, amplitude: 0.6, phase: 0 }),
            createComponent({ type: WaveformTypes.SINE, frequency: 880, amplitude: 0.3, phase: 0 }),
            createComponent({ type: WaveformTypes.SINE, frequency: 1320, amplitude: 0.15, phase: Math.PI / 4 }),
            createComponent({ type: WaveformTypes.SQUARE, frequency: 220, amplitude: 0.2, phase: 0 }),
            createComponent({ type: WaveformTypes.NOISE, frequency: 0, amplitude: 0.05, phase: 0 })
        ];
    }

    function normalizeSignal(signal) {
        let max = 0;
        for (let i = 0; i < signal.length; i++) {
            const abs = Math.abs(signal[i]);
            if (abs > max) max = abs;
        }
        if (max === 0) return signal;
        
        const normalized = new Array(signal.length);
        for (let i = 0; i < signal.length; i++) {
            normalized[i] = signal[i] / max;
        }
        return normalized;
    }

    function findPeaks(freqs, spectrum, thresholdDb = -40, minDistance = 5) {
        const peaks = [];
        const n = spectrum.length;
        
        for (let i = 2; i < n - 2; i++) {
            if (spectrum[i] > thresholdDb &&
                spectrum[i] > spectrum[i - 1] &&
                spectrum[i] > spectrum[i + 1] &&
                spectrum[i] > spectrum[i - 2] &&
                spectrum[i] > spectrum[i + 2]) {
                
                let isFarEnough = true;
                for (const peak of peaks) {
                    if (Math.abs(peak.index - i) < minDistance) {
                        isFarEnough = false;
                        break;
                    }
                }
                
                if (isFarEnough) {
                    peaks.push({
                        index: i,
                        frequency: freqs[i],
                        magnitude: spectrum[i]
                    });
                }
            }
        }
        
        peaks.sort((a, b) => b.magnitude - a.magnitude);
        return peaks.slice(0, 10);
    }

    return {
        WaveformTypes,
        generateWaveform,
        generateSignal,
        getWaveformTypeName,
        createComponent,
        getDefaultComponents,
        normalizeSignal,
        findPeaks
    };
})();
