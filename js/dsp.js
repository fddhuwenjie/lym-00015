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
            
            let sum = 0;
            for (let i = 0; i < N; i++) {
                sum += window[i];
            }
            const correction = N / sum;
            
            for (let i = 0; i < N; i++) {
                window[i] *= correction;
            }
            
            return window;
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

    function computeMagnitudeSpectrum(fftResult) {
        const N = fftResult.length;
        const halfN = Math.floor(N / 2);
        const magnitude = new Array(halfN);
        
        for (let k = 0; k < halfN; k++) {
            magnitude[k] = fftResult[k].magnitude() / (N / 2);
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

    function computePSD(fftResult, sampleRate) {
        const N = fftResult.length;
        const halfN = Math.floor(N / 2);
        const psd = new Array(halfN);
        const freqBin = sampleRate / N;
        
        for (let k = 0; k < halfN; k++) {
            const mag = fftResult[k].magnitude();
            psd[k] = (mag * mag) / (N * freqBin);
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
        sinc
    };
})();
