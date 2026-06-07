const DSP = (function() {

    class Complex {
        constructor(real = 0, imag = 0) {
            this.real = real;
            this.imag = imag;
        }

        add(c) {
            return new Complex(this.real + c.real, this.imag + c.imag);
        }

        sub(c) {
            return new Complex(this.real - c.real, this.imag - c.imag);
        }

        mul(c) {
            return new Complex(
                this.real * c.real - this.imag * c.imag,
                this.real * c.imag + this.imag * c.real
            );
        }

        scale(k) {
            return new Complex(this.real * k, this.imag * k);
        }

        magnitude() {
            return Math.sqrt(this.real * this.real + this.imag * this.imag);
        }

        magnitudeSquared() {
            return this.real * this.real + this.imag * this.imag;
        }

        phase() {
            return Math.atan2(this.imag, this.real);
        }

        conjugate() {
            return new Complex(this.real, -this.imag);
        }

        div(c) {
            const denom = c.real * c.real + c.imag * c.imag;
            if (denom === 0) {
                return new Complex(0, 0);
            }
            const real = (this.real * c.real + this.imag * c.imag) / denom;
            const imag = (this.imag * c.real - this.real * c.imag) / denom;
            return new Complex(real, imag);
        }

        static exp(theta) {
            return new Complex(Math.cos(theta), Math.sin(theta));
        }
    }

    function nextPowerOf2(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    function isPowerOf2(n) {
        return (n & (n - 1)) === 0 && n !== 0;
    }

    function bitReverse(n, bits) {
        let reversed = 0;
        for (let i = 0; i < bits; i++) {
            reversed = (reversed << 1) | (n & 1);
            n >>= 1;
        }
        return reversed;
    }

    function fft(input) {
        const n = input.length;
        
        if (!isPowerOf2(n)) {
            const nextN = nextPowerOf2(n);
            const padded = new Array(nextN).fill(null).map(() => new Complex(0, 0));
            for (let i = 0; i < n; i++) {
                padded[i] = input[i] instanceof Complex ? input[i] : new Complex(input[i], 0);
            }
            return fft(padded);
        }

        const bits = Math.log2(n);
        const output = new Array(n);

        for (let i = 0; i < n; i++) {
            output[bitReverse(i, bits)] = input[i] instanceof Complex ? input[i] : new Complex(input[i], 0);
        }

        for (let size = 2; size <= n; size <<= 1) {
            const halfSize = size >> 1;
            const angleStep = -2 * Math.PI / size;

            for (let i = 0; i < n; i += size) {
                for (let j = 0; j < halfSize; j++) {
                    const w = Complex.exp(angleStep * j);
                    const t = output[i + j + halfSize].mul(w);
                    output[i + j + halfSize] = output[i + j].sub(t);
                    output[i + j] = output[i + j].add(t);
                }
            }
        }

        return output;
    }

    function ifft(input) {
        const n = input.length;
        const conjugated = input.map(c => c.conjugate());
        const result = fft(conjugated);
        return result.map(c => c.conjugate().scale(1 / n));
    }

    function rfft(realInput) {
        const n = realInput.length;
        const complexInput = realInput.map(x => new Complex(x, 0));
        return fft(complexInput);
    }

    const WindowFunctions = {
        rectangular(n, N) {
            return 1.0;
        },

        hann(n, N) {
            return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
        },

        hamming(n, N) {
            return 0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1));
        },

        blackman(n, N) {
            const a0 = 0.42;
            const a1 = 0.5;
            const a2 = 0.08;
            return a0 - a1 * Math.cos(2 * Math.PI * n / (N - 1)) + a2 * Math.cos(4 * Math.PI * n / (N - 1));
        },

        besselI0(x) {
            let sum = 1.0;
            let term = 1.0;
            for (let i = 1; i <= 20; i++) {
                term *= (x * x) / (4 * i * i);
                sum += term;
                if (term < 1e-10) break;
            }
            return sum;
        },

        kaiser(n, N, beta = 6) {
            const alpha = (N - 1) / 2;
            const arg = beta * Math.sqrt(1 - Math.pow((n - alpha) / alpha, 2));
            return WindowFunctions.besselI0(arg) / WindowFunctions.besselI0(beta);
        },

        generate(type, N) {
            const window = new Array(N);
            const func = WindowFunctions[type] || WindowFunctions.rectangular;
            
            for (let n = 0; n < N; n++) {
                if (type === 'kaiser') {
                    window[n] = WindowFunctions.kaiser(n, N, 6);
                } else {
                    window[n] = func(n, N);
                }
            }
            
            return window;
        },

        getCoherentGain(window) {
            let sum = 0;
            for (let i = 0; i < window.length; i++) {
                sum += window[i];
            }
            return sum / window.length;
        },

        getEnergyGain(window) {
            let sumSq = 0;
            for (let i = 0; i < window.length; i++) {
                sumSq += window[i] * window[i];
            }
            return sumSq / window.length;
        },

        apply(signal, window) {
            const N = Math.min(signal.length, window.length);
            const result = new Array(N);
            for (let i = 0; i < N; i++) {
                result[i] = signal[i] * window[i];
            }
            return result;
        }
    };

    function sinc(x) {
        if (Math.abs(x) < 1e-10) return 1.0;
        return Math.sin(Math.PI * x) / (Math.PI * x);
    }

    function computeFreqResponseAtFreq(h, freq, sampleRate) {
        const omega = 2 * Math.PI * freq / sampleRate;
        let real = 0;
        let imag = 0;
        for (let n = 0; n < h.length; n++) {
            real += h[n] * Math.cos(omega * n);
            imag -= h[n] * Math.sin(omega * n);
        }
        return Math.sqrt(real * real + imag * imag);
    }

    function designFIRFilter(type, order, fc1, fc2, sampleRate, windowType = 'hann') {
        const M = order;
        const N = M + 1;
        const normalizedFc1 = fc1 / sampleRate;
        const normalizedFc2 = fc2 ? fc2 / sampleRate : 0;
        
        let h = new Array(N);
        const center = M / 2;
        const window = WindowFunctions.generate(windowType, N);

        for (let n = 0; n < N; n++) {
            let val;
            const x = n - center;

            switch (type) {
                case 'lowpass':
                    val = 2 * normalizedFc1 * sinc(2 * normalizedFc1 * x);
                    break;
                case 'highpass':
                    val = sinc(x) - 2 * normalizedFc1 * sinc(2 * normalizedFc1 * x);
                    break;
                case 'bandpass':
                    val = 2 * normalizedFc2 * sinc(2 * normalizedFc2 * x) - 2 * normalizedFc1 * sinc(2 * normalizedFc1 * x);
                    break;
                case 'bandstop':
                    val = sinc(x) - 2 * normalizedFc2 * sinc(2 * normalizedFc2 * x) + 2 * normalizedFc1 * sinc(2 * normalizedFc1 * x);
                    break;
                default:
                    val = (n === Math.floor(center)) ? 1 : 0;
            }

            h[n] = val * window[n];
        }

        let normGain = 0;
        if (type === 'lowpass') {
            for (let i = 0; i < h.length; i++) {
                normGain += h[i];
            }
        } else if (type === 'highpass') {
            for (let i = 0; i < h.length; i++) {
                normGain += h[i] * Math.pow(-1, i);
            }
        } else if (type === 'bandpass') {
            const centerFreq = (fc1 + fc2) / 2;
            normGain = computeFreqResponseAtFreq(h, centerFreq, sampleRate);
        } else if (type === 'bandstop') {
            const passbandFreq = fc1 / 2;
            normGain = computeFreqResponseAtFreq(h, passbandFreq, sampleRate);
        }
        if (normGain !== 0) {
            for (let i = 0; i < h.length; i++) {
                h[i] /= normGain;
            }
        }

        return h;
    }

    function convolve(signal, kernel) {
        const N = signal.length;
        const M = kernel.length;
        const result = new Array(N).fill(0);

        for (let n = 0; n < N; n++) {
            for (let k = 0; k < M; k++) {
                if (n - k >= 0) {
                    result[n] += signal[n - k] * kernel[k];
                }
            }
        }

        return result;
    }

    function applyFilter(signal, type, order, fc1, fc2, sampleRate) {
        if (type === 'none') return signal.slice();
        const kernel = designFIRFilter(type, order, fc1, fc2, sampleRate);
        return convolve(signal, kernel);
    }

    function computeMagnitudeSpectrum(fftResult, coherentGain = 1.0) {
        const N = fftResult.length;
        const halfN = Math.floor(N / 2);
        const magnitude = new Array(halfN);
        const scale = 1.0 / ((N / 2) * coherentGain);
        
        for (let k = 0; k < halfN; k++) {
            magnitude[k] = fftResult[k].magnitude() * scale;
        }
        
        magnitude[0] /= 2;
        if (halfN * 2 === N) {
            magnitude[halfN - 1] /= 2;
        }
        
        return magnitude;
    }

    function computePhaseSpectrum(fftResult) {
        const N = fftResult.length;
        const halfN = Math.floor(N / 2);
        const phase = new Array(halfN);
        
        for (let k = 0; k < halfN; k++) {
            const mag = fftResult[k].magnitude();
            phase[k] = mag > 1e-10 ? fftResult[k].phase() : 0;
        }
        
        return phase;
    }

    function computePSD(fftResult, sampleRate, energyGain = 1.0) {
        const N = fftResult.length;
        const halfN = Math.floor(N / 2);
        const psd = new Array(halfN);
        const freqBin = sampleRate / N;
        const scale = 1.0 / (N * freqBin * energyGain);
        
        for (let k = 0; k < halfN; k++) {
            const mag = fftResult[k].magnitude();
            psd[k] = (mag * mag) * scale;
            if (k > 0 && k < halfN - 1) {
                psd[k] *= 2;
            }
        }
        
        return psd;
    }

    function linearToDb(value, reference = 1.0) {
        if (value <= 0) return -120;
        return 20 * Math.log10(value / reference);
    }

    function generateFrequencyAxis(N, sampleRate) {
        const halfN = Math.floor(N / 2);
        const freqs = new Array(halfN);
        const freqBin = sampleRate / N;
        
        for (let k = 0; k < halfN; k++) {
            freqs[k] = k * freqBin;
        }
        
        return freqs;
    }

    function generateTimeAxis(N, sampleRate) {
        const times = new Array(N);
        const dt = 1 / sampleRate;
        
        for (let n = 0; n < N; n++) {
            times[n] = n * dt;
        }
        
        return times;
    }

    function stft(signal, windowSize, hopSize, windowType = 'hann', sampleRate) {
        const N = signal.length;
        const window = WindowFunctions.generate(windowType, windowSize);
        const numFrames = Math.floor((N - windowSize) / hopSize) + 1;
        const halfWindow = Math.floor(windowSize / 2);
        
        const spectrogram = [];
        const timeAxis = [];
        const freqAxis = generateFrequencyAxis(windowSize, sampleRate);
        
        for (let i = 0; i < numFrames; i++) {
            const start = i * hopSize;
            const frame = new Array(windowSize);
            
            for (let j = 0; j < windowSize; j++) {
                const idx = start + j;
                frame[j] = (idx >= 0 && idx < N) ? signal[idx] * window[j] : 0;
            }
            
            const complexFrame = frame.map(x => new Complex(x, 0));
            const fftResult = fft(complexFrame);
            const magnitude = computeMagnitudeSpectrum(fftResult, WindowFunctions.getCoherentGain(window));
            
            spectrogram.push(magnitude);
            timeAxis.push((start + windowSize / 2) / sampleRate);
        }
        
        return {
            spectrogram,
            timeAxis,
            freqAxis,
            numFrames,
            windowSize,
            hopSize
        };
    }

    function linearToMel(freq) {
        return 2595 * Math.log10(1 + freq / 700);
    }

    function melToLinear(mel) {
        return 700 * (Math.pow(10, mel / 2595) - 1);
    }

    function generateMelAxis(numBins, sampleRate, fftSize) {
        const melMin = linearToMel(0);
        const melMax = linearToMel(sampleRate / 2);
        const melStep = (melMax - melMin) / (numBins - 1);
        
        const melAxis = new Array(numBins);
        const linearAxis = new Array(numBins);
        
        for (let i = 0; i < numBins; i++) {
            const mel = melMin + i * melStep;
            melAxis[i] = mel;
            linearAxis[i] = melToLinear(mel);
        }
        
        return { melAxis, linearAxis };
    }

    function gaussianNoise(mean = 0, std = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function addNoise(signal, snrDb) {
        const N = signal.length;
        let signalPower = 0;
        
        for (let i = 0; i < N; i++) {
            signalPower += signal[i] * signal[i];
        }
        signalPower /= N;
        
        const noisePower = signalPower / Math.pow(10, snrDb / 10);
        const noiseStd = Math.sqrt(noisePower);
        
        const result = new Array(N);
        for (let i = 0; i < N; i++) {
            result[i] = signal[i] + gaussianNoise(0, noiseStd);
        }
        
        return result;
    }

    function hilbertTransform(signal) {
        const N = signal.length;
        const N2 = nextPowerOf2(N);
        const padded = new Array(N2).fill(null).map(() => new Complex(0, 0));
        
        for (let i = 0; i < N; i++) {
            padded[i] = new Complex(signal[i], 0);
        }
        
        const fftResult = fft(padded);
        
        for (let i = 1; i < N2 / 2; i++) {
            fftResult[i] = fftResult[i].scale(2);
        }
        for (let i = N2 / 2 + 1; i < N2; i++) {
            fftResult[i] = new Complex(0, 0);
        }
        
        const ifftResult = ifft(fftResult);
        const analytic = new Array(N);
        
        for (let i = 0; i < N; i++) {
            analytic[i] = ifftResult[i];
        }
        
        return analytic;
    }

    function amplitudeModulate(message, carrierFreq, sampleRate, modulationIndex = 1, carrierAmplitude = 1) {
        const N = message.length;
        const result = new Array(N);
        
        for (let i = 0; i < N; i++) {
            const t = i / sampleRate;
            const carrier = Math.cos(2 * Math.PI * carrierFreq * t);
            result[i] = carrierAmplitude * (1 + modulationIndex * message[i]) * carrier;
        }
        
        return result;
    }

    function dsbScModulate(message, carrierFreq, sampleRate, carrierAmplitude = 1) {
        const N = message.length;
        const result = new Array(N);
        
        for (let i = 0; i < N; i++) {
            const t = i / sampleRate;
            const carrier = Math.cos(2 * Math.PI * carrierFreq * t);
            result[i] = carrierAmplitude * message[i] * carrier;
        }
        
        return result;
    }

    function ssbModulate(message, carrierFreq, sampleRate, sideband = 'upper', carrierAmplitude = 1) {
        const N = message.length;
        const analytic = hilbertTransform(message);
        const result = new Array(N);
        
        for (let i = 0; i < N; i++) {
            const t = i / sampleRate;
            const carrierCos = Math.cos(2 * Math.PI * carrierFreq * t);
            const carrierSin = Math.sin(2 * Math.PI * carrierFreq * t);
            
            if (sideband === 'upper') {
                result[i] = carrierAmplitude * (analytic[i].real * carrierCos - analytic[i].imag * carrierSin);
            } else {
                result[i] = carrierAmplitude * (analytic[i].real * carrierCos + analytic[i].imag * carrierSin);
            }
        }
        
        return result;
    }

    function frequencyModulate(message, carrierFreq, sampleRate, modulationIndex = 1, carrierAmplitude = 1) {
        const N = message.length;
        const result = new Array(N);
        let phase = 0;
        const dt = 1 / sampleRate;
        
        for (let i = 0; i < N; i++) {
            phase += 2 * Math.PI * (carrierFreq + modulationIndex * message[i]) * dt;
            result[i] = carrierAmplitude * Math.cos(phase);
        }
        
        return result;
    }

    function phaseModulate(message, carrierFreq, sampleRate, modulationIndex = 1, carrierAmplitude = 1) {
        const N = message.length;
        const result = new Array(N);
        
        for (let i = 0; i < N; i++) {
            const t = i / sampleRate;
            const phase = 2 * Math.PI * carrierFreq * t + modulationIndex * message[i];
            result[i] = carrierAmplitude * Math.cos(phase);
        }
        
        return result;
    }

    function envelopeDetector(signal, sampleRate, timeConstant = 0.001) {
        const N = signal.length;
        const result = new Array(N);
        const alpha = Math.exp(-1 / (sampleRate * timeConstant));
        let envelope = 0;
        
        for (let i = 0; i < N; i++) {
            const rectified = Math.abs(signal[i]);
            if (rectified > envelope) {
                envelope = rectified;
            } else {
                envelope = envelope * alpha;
            }
            result[i] = envelope;
        }
        
        const mean = result.reduce((a, b) => a + b, 0) / N;
        for (let i = 0; i < N; i++) {
            result[i] -= mean;
        }
        
        return result;
    }

    function coherentDemodulate(signal, carrierFreq, sampleRate, timeConstant = 0.001) {
        const N = signal.length;
        const result = new Array(N);
        const alpha = Math.exp(-1 / (sampleRate * timeConstant));
        
        let filtered = 0;
        for (let i = 0; i < N; i++) {
            const t = i / sampleRate;
            const carrier = Math.cos(2 * Math.PI * carrierFreq * t);
            const product = signal[i] * carrier;
            filtered = filtered * alpha + product * (1 - alpha);
            result[i] = 2 * filtered;
        }
        
        const mean = result.reduce((a, b) => a + b, 0) / N;
        for (let i = 0; i < N; i++) {
            result[i] -= mean;
        }
        
        return result;
    }

    function pllDemodulate(signal, carrierFreq, sampleRate, loopBandwidth = 0.01) {
        const N = signal.length;
        const result = new Array(N);
        
        let phaseEstimate = 0;
        let freqEstimate = 2 * Math.PI * carrierFreq;
        let integrator = 0;
        
        const zeta = 0.707;
        const omegaN = loopBandwidth * 8 / (zeta + 1 / (4 * zeta));
        const kp = 2 * zeta * omegaN;
        const ki = omegaN * omegaN;
        const dt = 1 / sampleRate;
        
        for (let i = 0; i < N; i++) {
            const vcoOut = Math.cos(phaseEstimate);
            const vcoQuad = Math.sin(phaseEstimate);
            
            const error = signal[i] * vcoQuad;
            
            integrator += ki * error * dt;
            freqEstimate = 2 * Math.PI * carrierFreq + integrator;
            freqEstimate += kp * error;
            
            phaseEstimate += freqEstimate * dt;
            
            result[i] = (freqEstimate - 2 * Math.PI * carrierFreq) / (2 * Math.PI);
        }
        
        const mean = result.reduce((a, b) => a + b, 0) / N;
        for (let i = 0; i < N; i++) {
            result[i] -= mean;
        }
        
        return result;
    }

    function computeErrorPower(original, recovered) {
        const N = Math.min(original.length, recovered.length);
        let errorPower = 0;
        let signalPower = 0;
        
        for (let i = 0; i < N; i++) {
            const error = original[i] - recovered[i];
            errorPower += error * error;
            signalPower += original[i] * original[i];
        }
        
        errorPower /= N;
        signalPower /= N;
        
        const snr = signalPower > 0 ? 10 * Math.log10(signalPower / errorPower) : -Infinity;
        
        return {
            mse: errorPower,
            snrDb: snr,
            signalPower,
            errorPower
        };
    }

    function bilinearTransform(sZeros, sPoles, sGain, sampleRate) {
        const T = 1 / sampleRate;
        const c = 2 * sampleRate;
        
        const zZeros = [];
        const zPoles = [];
        
        for (const zero of sZeros) {
            if (Math.abs(zero.real) < 1e-10 && Math.abs(zero.imag) < 1e-10) {
                zZeros.push(new Complex(-1, 0));
            } else {
                const num = new Complex(c, 0).add(zero);
                const den = new Complex(c, 0).sub(zero);
                zZeros.push(num.div(den));
            }
        }
        
        for (const pole of sPoles) {
            if (Math.abs(pole.real) < 1e-10 && Math.abs(pole.imag) < 1e-10) {
                zPoles.push(new Complex(-1, 0));
            } else {
                const num = new Complex(c, 0).add(pole);
                const den = new Complex(c, 0).sub(pole);
                zPoles.push(num.div(den));
            }
        }
        
        let numGain = sGain;
        for (const zero of sZeros) {
            numGain *= Math.abs(new Complex(c, 0).sub(zero).magnitude());
        }
        
        let denGain = 1;
        for (const pole of sPoles) {
            denGain *= Math.abs(new Complex(c, 0).sub(pole).magnitude());
        }
        
        const zGain = numGain / denGain;
        
        return {
            zeros: zZeros,
            poles: zPoles,
            gain: zGain
        };
    }

    function zpkToSOS(zeros, poles, gain) {
        const sections = [];
        const n = Math.max(zeros.length, poles.length);
        
        for (let i = 0; i < n; i += 2) {
            const z1 = zeros[i];
            const z2 = zeros[i + 1];
            const p1 = poles[i];
            const p2 = poles[i + 1];
            
            let b0 = 1, b1 = 0, b2 = 0;
            let a0 = 1, a1 = 0, a2 = 0;
            
            if (z1 && z2) {
                if (Math.abs(z1.imag) < 1e-10 && Math.abs(z2.imag) < 1e-10) {
                    b1 = -(z1.real + z2.real);
                    b2 = z1.real * z2.real;
                } else {
                    b1 = -2 * z1.real;
                    b2 = z1.real * z1.real + z1.imag * z1.imag;
                }
            } else if (z1) {
                b1 = -z1.real;
                b2 = 0;
            }
            
            if (p1 && p2) {
                if (Math.abs(p1.imag) < 1e-10 && Math.abs(p2.imag) < 1e-10) {
                    a1 = -(p1.real + p2.real);
                    a2 = p1.real * p2.real;
                } else {
                    a1 = -2 * p1.real;
                    a2 = p1.real * p1.real + p1.imag * p1.imag;
                }
            } else if (p1) {
                a1 = -p1.real;
                a2 = 0;
            }
            
            if (i === 0) {
                b0 *= gain;
                b1 *= gain;
                b2 *= gain;
            }
            
            sections.push({
                b0, b1, b2,
                a0, a1, a2
            });
        }
        
        return sections;
    }

    function sosToZPK(sections) {
        let allZeros = [];
        let allPoles = [];
        let totalGain = 1;
        
        for (const section of sections) {
            totalGain *= section.b0;
            
            const b0 = section.b0, b1 = section.b1, b2 = section.b2;
            const a0 = section.a0, a1 = section.a1, a2 = section.a2;
            
            if (Math.abs(b2) > 1e-10) {
                const discB = b1 * b1 - 4 * b0 * b2;
                if (discB >= 0) {
                    const root1 = (-b1 + Math.sqrt(discB)) / (2 * b2);
                    const root2 = (-b1 - Math.sqrt(discB)) / (2 * b2);
                    allZeros.push(new Complex(root1, 0));
                    allZeros.push(new Complex(root2, 0));
                } else {
                    const real = -b1 / (2 * b2);
                    const imag = Math.sqrt(-discB) / (2 * b2);
                    allZeros.push(new Complex(real, imag));
                    allZeros.push(new Complex(real, -imag));
                }
            } else if (Math.abs(b1) > 1e-10) {
                const root = -b0 / b1;
                allZeros.push(new Complex(root, 0));
            }
            
            if (Math.abs(a2) > 1e-10) {
                const discA = a1 * a1 - 4 * a0 * a2;
                if (discA >= 0) {
                    const root1 = (-a1 + Math.sqrt(discA)) / (2 * a2);
                    const root2 = (-a1 - Math.sqrt(discA)) / (2 * a2);
                    allPoles.push(new Complex(root1, 0));
                    allPoles.push(new Complex(root2, 0));
                } else {
                    const real = -a1 / (2 * a2);
                    const imag = Math.sqrt(-discA) / (2 * a2);
                    allPoles.push(new Complex(real, imag));
                    allPoles.push(new Complex(real, -imag));
                }
            } else if (Math.abs(a1) > 1e-10) {
                const root = -a0 / a1;
                allPoles.push(new Complex(root, 0));
            }
        }
        
        return {
            zeros: allZeros,
            poles: allPoles,
            gain: totalGain
        };
    }

    function designButterworth(order, fc, sampleRate, type = 'lowpass') {
        const wc = 2 * Math.PI * fc;
        const sZeros = [];
        const sPoles = [];
        const fs2 = 2 * sampleRate;
        const warpedFc = (fs2 / Math.PI) * Math.tan(Math.PI * fc / sampleRate);
        const ww = 2 * Math.PI * warpedFc;
        
        for (let k = 0; k < order; k++) {
            const theta = Math.PI * (2 * k + order + 1) / (2 * order);
            const pole = new Complex(
                ww * Math.cos(theta),
                ww * Math.sin(theta)
            );
            sPoles.push(pole);
        }
        
        const blt = bilinearTransform(sZeros, sPoles, 1, sampleRate);
        let zeros = blt.zeros;
        let poles = blt.poles;
        let gain = blt.gain;
        
        if (type === 'highpass') {
            zeros = zeros.map(z => new Complex(-1, 0));
            const numSections = Math.ceil(order / 2);
            while (zeros.length < order) {
                zeros.push(new Complex(-1, 0));
            }
        } else if (type === 'bandpass' || type === 'bandstop') {
            console.warn('Bandpass/bandstop Butterworth requires two cutoff frequencies');
        }
        
        let dcGain = 1;
        if (type === 'lowpass') {
            dcGain = computeIIRFreqResponse(zpkToSOS(zeros, poles, gain), 0, sampleRate).magnitude;
        } else if (type === 'highpass') {
            dcGain = computeIIRFreqResponse(zpkToSOS(zeros, poles, gain), sampleRate / 2, sampleRate).magnitude;
        }
        if (dcGain > 0) {
            gain /= dcGain;
        }
        
        return {
            zeros,
            poles,
            gain,
            sos: zpkToSOS(zeros, poles, gain)
        };
    }

    function chebyshevPoly(n, x) {
        if (Math.abs(x) <= 1) {
            return Math.cos(n * Math.acos(x));
        } else {
            return Math.cosh(n * Math.acosh(x));
        }
    }

    function designChebyshev1(order, fc, sampleRate, rippleDb = 1, type = 'lowpass') {
        const epsilon = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
        const warpedFc = (2 * sampleRate / Math.PI) * Math.tan(Math.PI * fc / sampleRate);
        const ww = 2 * Math.PI * warpedFc;
        
        const sZeros = [];
        const sPoles = [];
        
        for (let k = 0; k < order; k++) {
            const theta = Math.PI * (2 * k + order + 1) / (2 * order);
            const sigma = -Math.sinh((1 / order) * Math.asinh(1 / epsilon)) * Math.cos(theta);
            const omega = Math.cosh((1 / order) * Math.asinh(1 / epsilon)) * Math.sin(theta);
            sPoles.push(new Complex(sigma * ww, omega * ww));
        }
        
        const blt = bilinearTransform(sZeros, sPoles, 1, sampleRate);
        let zeros = blt.zeros;
        let poles = blt.poles;
        let gain = blt.gain;
        
        if (type === 'highpass') {
            zeros = new Array(order).fill(null).map(() => new Complex(-1, 0));
        }
        
        let dcGain = 1;
        if (type === 'lowpass') {
            dcGain = computeIIRFreqResponse(zpkToSOS(zeros, poles, gain), 0, sampleRate).magnitude;
        } else if (type === 'highpass') {
            dcGain = computeIIRFreqResponse(zpkToSOS(zeros, poles, gain), sampleRate / 2, sampleRate).magnitude;
        }
        if (dcGain > 0) {
            gain /= dcGain;
        }
        
        return {
            zeros,
            poles,
            gain,
            sos: zpkToSOS(zeros, poles, gain)
        };
    }

    function designChebyshev2(order, fc, sampleRate, stopbandDb = 40, type = 'lowpass') {
        const epsilon = 1 / Math.sqrt(Math.pow(10, stopbandDb / 10) - 1);
        const warpedFc = (2 * sampleRate / Math.PI) * Math.tan(Math.PI * fc / sampleRate);
        const ww = 2 * Math.PI * warpedFc;
        
        const sZeros = [];
        const sPoles = [];
        
        for (let k = 0; k < order; k++) {
            const theta = Math.PI * (2 * k + order + 1) / (2 * order);
            
            const numReal = -Math.sinh((1 / order) * Math.asinh(1 / epsilon)) * Math.cos(theta);
            const numImag = Math.cosh((1 / order) * Math.asinh(1 / epsilon)) * Math.sin(theta);
            
            const magSq = numReal * numReal + numImag * numImag;
            const poleReal = numReal / magSq * ww * ww;
            const poleImag = -numImag / magSq * ww * ww;
            
            sPoles.push(new Complex(poleReal, poleImag));
            
            if (k < Math.floor(order / 2)) {
                const zeroTheta = Math.PI * (2 * k + 1) / (2 * order);
                const zeroImag = ww / Math.cos(zeroTheta);
                sZeros.push(new Complex(0, zeroImag));
                sZeros.push(new Complex(0, -zeroImag));
            }
        }
        
        const blt = bilinearTransform(sZeros, sPoles, 1, sampleRate);
        
        let dcGain = 1;
        const sos = zpkToSOS(blt.zeros, blt.poles, blt.gain);
        if (type === 'lowpass') {
            dcGain = computeIIRFreqResponse(sos, 0, sampleRate).magnitude;
        } else if (type === 'highpass') {
            dcGain = computeIIRFreqResponse(sos, sampleRate / 2, sampleRate).magnitude;
        }
        
        const normalizedSos = sos.map((s, i) => ({
            ...s,
            b0: i === 0 ? s.b0 / dcGain : s.b0,
            b1: i === 0 ? s.b1 / dcGain : s.b1,
            b2: i === 0 ? s.b2 / dcGain : s.b2
        }));
        
        const zpk = sosToZPK(normalizedSos);
        
        return {
            zeros: zpk.zeros,
            poles: zpk.poles,
            gain: zpk.gain,
            sos: normalizedSos
        };
    }

    function ellipDegenerate(u, m) {
        const k = Math.sqrt(m);
        const kprime = Math.sqrt(1 - m);
        
        if (m === 0) return u;
        if (m === 1) return Math.tanh(u);
        
        let v = u;
        let a = 1;
        let b = kprime;
        let c = Math.sqrt(1 - kprime * kprime);
        
        while (c > 1e-10) {
            const aNext = (a + b) / 2;
            const bNext = Math.sqrt(a * b);
            c = (a - b) / 2;
            a = aNext;
            b = bNext;
        }
        
        return (2 / Math.PI) * a * Math.atan(Math.sinh(v)) ;
    }

    function designElliptic(order, fc, sampleRate, passbandDb = 1, stopbandDb = 40, type = 'lowpass') {
        const wp = 2 * Math.PI * fc;
        const ws = wp * 1.5;
        
        const k = wp / ws;
        const k1 = Math.sqrt(Math.pow(10, passbandDb / 10) - 1) / Math.sqrt(Math.pow(10, stopbandDb / 10) - 1);
        
        const warpedFc = (2 * sampleRate / Math.PI) * Math.tan(Math.PI * fc / sampleRate);
        const ww = 2 * Math.PI * warpedFc;
        
        const epsilon = Math.sqrt(Math.pow(10, passbandDb / 10) - 1);
        
        const sZeros = [];
        const sPoles = [];
        
        for (let kIdx = 0; kIdx < order; kIdx++) {
            const theta = Math.PI * (2 * kIdx + order + 1) / (2 * order);
            
            const r = 1 / Math.tanh((1 / order) * Math.asinh(1 / epsilon));
            const sigma = -r * Math.cos(theta) / Math.sqrt(1 + Math.pow(Math.tan(theta), 2) / (r * r));
            const omega = r * Math.sin(theta) / Math.sqrt(1 + Math.pow(Math.tan(theta), 2) / (r * r));
            
            sPoles.push(new Complex(sigma * ww, omega * ww));
            
            if (kIdx < Math.floor(order / 2)) {
                const zeroTheta = Math.PI * (2 * kIdx + 1) / (2 * order);
                const zeroImag = ww / Math.cos(zeroTheta);
                sZeros.push(new Complex(0, zeroImag));
                sZeros.push(new Complex(0, -zeroImag));
            }
        }
        
        const blt = bilinearTransform(sZeros, sPoles, 1, sampleRate);
        
        let dcGain = 1;
        const sos = zpkToSOS(blt.zeros, blt.poles, blt.gain);
        if (type === 'lowpass') {
            dcGain = computeIIRFreqResponse(sos, 0, sampleRate).magnitude;
        } else if (type === 'highpass') {
            dcGain = computeIIRFreqResponse(sos, sampleRate / 2, sampleRate).magnitude;
        }
        
        const normalizedSos = sos.map((s, i) => ({
            ...s,
            b0: i === 0 ? s.b0 / dcGain : s.b0,
            b1: i === 0 ? s.b1 / dcGain : s.b1,
            b2: i === 0 ? s.b2 / dcGain : s.b2
        }));
        
        const zpk = sosToZPK(normalizedSos);
        
        return {
            zeros: zpk.zeros,
            poles: zpk.poles,
            gain: zpk.gain,
            sos: normalizedSos
        };
    }

    function computeIIRFreqResponse(sections, freq, sampleRate) {
        const omega = 2 * Math.PI * freq / sampleRate;
        const z = Complex.exp(omega);
        const zSq = z.mul(z);
        
        let totalNum = new Complex(1, 0);
        let totalDen = new Complex(1, 0);
        
        for (const section of sections) {
            const num = new Complex(section.b0, 0).mul(zSq)
                .add(new Complex(section.b1, 0).mul(z))
                .add(new Complex(section.b2, 0));
            const den = new Complex(section.a0, 0).mul(zSq)
                .add(new Complex(section.a1, 0).mul(z))
                .add(new Complex(section.a2, 0));
            
            totalNum = totalNum.mul(num);
            totalDen = totalDen.mul(den);
        }
        
        const response = totalNum.div(totalDen);
        
        return {
            magnitude: response.magnitude(),
            phase: response.phase(),
            complex: response
        };
    }

    function computeIIRImpulseResponse(sections, length) {
        const result = new Array(length).fill(0);
        result[0] = 1;
        return applyIIRFilter(result, sections);
    }

    function applyIIRFilter(signal, sections) {
        const N = signal.length;
        let y = signal.slice();
        
        for (const section of sections) {
            const b0 = section.b0 / section.a0;
            const b1 = section.b1 / section.a0;
            const b2 = section.b2 / section.a0;
            const a1 = section.a1 / section.a0;
            const a2 = section.a2 / section.a0;
            
            const x = y;
            y = new Array(N).fill(0);
            
            for (let n = 0; n < N; n++) {
                y[n] = b0 * x[n];
                if (n >= 1) {
                    y[n] += b1 * x[n - 1] - a1 * y[n - 1];
                }
                if (n >= 2) {
                    y[n] += b2 * x[n - 2] - a2 * y[n - 2];
                }
            }
        }
        
        return y;
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

    return {
        Complex,
        fft,
        ifft,
        rfft,
        nextPowerOf2,
        isPowerOf2,
        WindowFunctions,
        designFIRFilter,
        convolve,
        applyFilter,
        computeMagnitudeSpectrum,
        computePhaseSpectrum,
        computePSD,
        linearToDb,
        generateFrequencyAxis,
        generateTimeAxis,
        sinc,
        computeFreqResponseAtFreq,
        stft,
        linearToMel,
        melToLinear,
        generateMelAxis,
        gaussianNoise,
        addNoise,
        hilbertTransform,
        amplitudeModulate,
        dsbScModulate,
        ssbModulate,
        frequencyModulate,
        phaseModulate,
        envelopeDetector,
        coherentDemodulate,
        pllDemodulate,
        computeErrorPower,
        bilinearTransform,
        zpkToSOS,
        sosToZPK,
        designButterworth,
        designChebyshev1,
        designChebyshev2,
        designElliptic,
        computeIIRFreqResponse,
        computeIIRImpulseResponse,
        applyIIRFilter,
        normalizeSignal
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DSP;
}
