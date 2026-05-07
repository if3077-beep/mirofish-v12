/**
 * MiroFish v13 - 音效系统
 * Web Audio API 氛围音效 + 情绪匹配 + 空间混响
 */

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.reverb = null;
    this.enabled = true;
    this.sounds = {};
    this._ambientNodes = [];
    this._init();
  }

  _init() {
    const start = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.5;
        this._createReverb();
        this._build();
      }
      document.removeEventListener('click', start);
      document.removeEventListener('touchstart', start);
    };
    document.addEventListener('click', start);
    document.addEventListener('touchstart', start);
  }

  _createReverb() {
    const rate = this.ctx.sampleRate;
    const length = rate * 1.5;
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = impulse;
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.15;
    this.reverb.connect(reverbGain);
    reverbGain.connect(this.master);
    this._reverbGain = reverbGain;
  }

  startAmbient(mood) {
    this.stopAmbient();
    if (!this.ctx || !this.enabled) return;

    const moodConfig = {
      anxious: { freqs: [55, 82.5, 110], gain: 0.04, filterFreq: 200, type: 'sawtooth' },
      sad:     { freqs: [65, 98, 130], gain: 0.03, filterFreq: 300, type: 'sine' },
      fearful: { freqs: [49, 73.5, 98], gain: 0.04, filterFreq: 150, type: 'triangle' },
      confused:{ freqs: [73, 110, 147], gain: 0.03, filterFreq: 400, type: 'sine' },
      angry:   { freqs: [55, 82, 110], gain: 0.05, filterFreq: 250, type: 'sawtooth' },
      hopeful: { freqs: [130, 196, 262], gain: 0.03, filterFreq: 800, type: 'sine' },
      excited: { freqs: [165, 247, 330], gain: 0.04, filterFreq: 600, type: 'triangle' },
      neutral: { freqs: [110, 165, 220], gain: 0.025, filterFreq: 500, type: 'sine' },
    };

    const config = moodConfig[mood] || moodConfig.neutral;
    const now = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = config.filterFreq;
    filter.Q.value = 1;

    config.freqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = config.type;
      osc.frequency.value = freq;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 1.01, now + 4);
      osc.frequency.linearRampToValueAtTime(freq, now + 8);
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(config.gain, now + 2);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      gain.connect(this.reverb);
      osc.start(now);
      this._ambientNodes.push({ osc, gain });
    });
  }

  stopAmbient() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this._ambientNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.stop(now + 1.1);
      } catch (e) {}
    });
    this._ambientNodes = [];
  }

  _build() {
    this.sounds.click = () => this._tone(800, 600, 0.1, 0.2, 'sine');
    this.sounds.hover = () => this._tone(1000, 1000, 0.05, 0.03, 'sine');
    this.sounds.type = () => this._tone(600 + Math.random() * 200, 600, 0.04, 0.06, 'sine');
    this.sounds.tick = () => this._tone(1200, 1000, 0.03, 0.08, 'sine');
    this.sounds.transition = () => this._chord([400, 500, 600], 0.2, 0.12, 'sine');
    this.sounds.expand = () => this._tone(400, 800, 0.15, 0.12, 'sine');
    this.sounds.collapse = () => this._tone(800, 400, 0.15, 0.12, 'sine');
    this.sounds.progress = () => this._steps([500, 600, 700], 0.06, 0.1, 'sine');
    this.sounds.data = () => this._steps([800, 1000, 1200], 0.05, 0.08, 'triangle');

    this.sounds.connect = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.1);
      osc.frequency.setValueAtTime(600, now + 0.2);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    };

    this.sounds.scan = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(300, now + 1);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 1);
      osc.start(now); osc.stop(now + 1);
    };

    this.sounds.success = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.1);
        g.gain.setValueAtTime(0.2, now + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
      });
    };

    this.sounds.complete = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g);
        g.connect(this.master);
        g.connect(this.reverb);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.12);
        g.gain.setValueAtTime(0.18, now + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.5);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.5);
      });
    };

    this.sounds.warning = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(this.master);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now + i * 0.15);
        g.gain.setValueAtTime(0.12, now + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.1);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.1);
      }
    };

    this.sounds.error = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    };

    // 共情音（温暖下行）
    this.sounds.empathy = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      [660, 550, 440].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(this.master); g.connect(this.reverb);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.15);
        g.gain.setValueAtTime(0.12, now + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.3);
      });
    };

    // 路径揭示音
    this.sounds.reveal = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master); g.connect(this.reverb);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.3);
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
    };

    // 撒花音
    this.sounds.sparkle = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g); g.connect(this.master);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 1200, now + i * 0.05);
        g.gain.setValueAtTime(0.08, now + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.1);
      }
    };

    // 滑块音
    this.sounds.slide = () => {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.08);
      g.gain.setValueAtTime(0.06, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    };
  }

  _tone(startFreq, endFreq, duration, gain, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g); g.connect(this.master);
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now); osc.stop(now + duration);
  }

  _chord(freqs, duration, gain, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master); g.connect(this.reverb);
      osc.type = type;
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(gain * 0.7, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + duration);
      osc.start(now); osc.stop(now + duration);
    });
  }

  _steps(freqs, stepDur, gain, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.connect(g); g.connect(this.master);
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + i * stepDur);
      g.gain.setValueAtTime(gain, now + i * stepDur);
      g.gain.exponentialRampToValueAtTime(0.01, now + i * stepDur + stepDur * 1.5);
      osc.start(now + i * stepDur);
      osc.stop(now + i * stepDur + stepDur * 1.5);
    });
  }

  play(name) {
    if (this.sounds[name]) this.sounds[name]();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopAmbient();
    return this.enabled;
  }
}

window.audioSystem = new AudioSystem();
