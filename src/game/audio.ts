// ============================================================
// Void Survivors — Procedural Audio (Web Audio API)
// ============================================================

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.3;
  private sfxVolume: number = 1.0;

  // ── Music State ──────────────────────────────────────────────
  private musicGain: GainNode | null = null;
  private musicPlaying: boolean = false;
  private musicIntensity: number = 0;
  private musicMasterVolume: number = 0.12;

  // Bass drone nodes
  private bassDroneOsc: OscillatorNode | null = null;
  private bassDroneGain: GainNode | null = null;
  private bassDroneLfo: OscillatorNode | null = null;
  private bassDroneLfoGain: GainNode | null = null;

  // Pad layer nodes
  private padOscillators: OscillatorNode[] = [];
  private padGains: GainNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private padMixGain: GainNode | null = null;
  private padChordIndex: number = 0;
  private padChordTimer: ReturnType<typeof setInterval> | null = null;

  // Rhythmic pulse nodes
  private pulseOsc: OscillatorNode | null = null;
  private pulseGain: GainNode | null = null;
  private pulseFilter: BiquadFilterNode | null = null;
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private pulseBaseVolume: number = 0.04;
  private pulseBaseTempo: number = 600; // ms (100 BPM)

  // High atmosphere nodes
  private atmosphereTimer: ReturnType<typeof setInterval> | null = null;
  private atmosphereGain: GainNode | null = null;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    // SFX gain node sits between individual SFX and masterGain
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);
  }

  private ensureContext(): void {
    if (!this.ctx || this.ctx.state === 'suspended') {
      this.ctx?.resume();
    }
  }

  // ── Sound Effects ─────────────────────────────────────────────

  private get sfxOutput(): GainNode | null {
    return this.sfxGain || this.masterGain;
  }

  playShoot(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxOutput);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playHit(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxOutput);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playExplosion(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;

    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain);
    gain.connect(this.sfxOutput);
    osc.start(t);
    osc.stop(t + 0.5);

    // Noise burst via buffer
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxOutput);
    noise.start(t);
  }

  playPickup(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.setValueAtTime(800, t + 0.05);
    osc.frequency.setValueAtTime(1000, t + 0.1);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxOutput);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playLevelUp(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = t + i * 0.1;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxOutput!);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  playDamage(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxOutput);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playBossSpawn(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;

    // Ominous low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.linearRampToValueAtTime(40, t + 1.0);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.3);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(gain);
    gain.connect(this.sfxOutput);
    osc.start(t);
    osc.stop(t + 1.2);

    // Sub bass
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(30, t);

    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(0.3, t + 0.5);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    sub.connect(subGain);
    subGain.connect(this.sfxOutput);
    sub.start(t);
    sub.stop(t + 1.5);
  }

  playAchievement(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;
    // Triumphant fanfare: ascending arpeggio with shimmer
    const notes = [659, 784, 988, 1319]; // E5, G5, B5, E6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = t + i * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxOutput!);
      osc.start(start);
      osc.stop(start + 0.4);
    });

    // Shimmer overlay
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(2637, t + 0.24); // E7
    shimmerGain.gain.setValueAtTime(0, t + 0.24);
    shimmerGain.gain.linearRampToValueAtTime(0.08, t + 0.28);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.sfxOutput);
    shimmer.start(t + 0.24);
    shimmer.stop(t + 0.8);
  }

  playGameOver(): void {
    this.ensureContext();
    if (!this.ctx || !this.sfxOutput || this.muted) return;

    const t = this.ctx.currentTime;
    const notes = [440, 370, 311, 261]; // A4 descending

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = t + i * 0.2;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxOutput!);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  // ── Ambient Music System ─────────────────────────────────────

  startMusic(): void {
    this.ensureContext();
    if (!this.ctx || !this.masterGain || this.musicPlaying) return;

    // Master music gain (separate from SFX)
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.muted ? 0 : this.musicMasterVolume;
    this.musicGain.connect(this.masterGain);

    this.startBassDrone();
    this.startPadLayer();
    this.startRhythmicPulse();
    this.startAtmosphere();

    this.musicPlaying = true;
    this.musicIntensity = 0;
  }

  stopMusic(): void {
    if (!this.ctx || !this.musicGain || !this.musicPlaying) return;

    const t = this.ctx.currentTime;

    // Fade out over 2 seconds
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + 2);

    // Schedule cleanup after fade
    setTimeout(() => {
      this.cleanupMusic();
    }, 2200);

    this.musicPlaying = false;
  }

  setMusicIntensity(level: number): void {
    this.musicIntensity = Math.max(0, Math.min(1, level));
    if (!this.ctx || !this.musicPlaying) return;

    const t = this.ctx.currentTime;

    // Increase rhythmic pulse volume with intensity
    if (this.pulseGain) {
      const pulseVol = this.pulseBaseVolume + this.musicIntensity * 0.06;
      this.pulseGain.gain.cancelScheduledValues(t);
      this.pulseGain.gain.setValueAtTime(this.pulseGain.gain.value, t);
      this.pulseGain.gain.linearRampToValueAtTime(pulseVol, t + 0.5);
    }

    // Increase bass drone LFO depth with intensity
    if (this.bassDroneLfoGain) {
      const lfoDepth = 5 + this.musicIntensity * 15;
      this.bassDroneLfoGain.gain.cancelScheduledValues(t);
      this.bassDroneLfoGain.gain.setValueAtTime(
        this.bassDroneLfoGain.gain.value,
        t
      );
      this.bassDroneLfoGain.gain.linearRampToValueAtTime(lfoDepth, t + 1);
    }

    // Add dissonance to pad filter — lower cutoff at low intensity, wider at high
    if (this.padFilter) {
      const cutoff = 800 + this.musicIntensity * 600;
      this.padFilter.frequency.cancelScheduledValues(t);
      this.padFilter.frequency.setValueAtTime(
        this.padFilter.frequency.value,
        t
      );
      this.padFilter.frequency.linearRampToValueAtTime(cutoff, t + 1);
    }

    // Add dissonant detune to pad oscillators at higher intensity
    this.padOscillators.forEach((osc, i) => {
      const detune = this.musicIntensity * (i * 8 - 8); // spread detune
      osc.detune.cancelScheduledValues(t);
      osc.detune.setValueAtTime(osc.detune.value, t);
      osc.detune.linearRampToValueAtTime(detune, t + 1);
    });

    // Speed up pulse tempo slightly with intensity
    this.restartPulseScheduler();
  }

  // ── Music: Bass Drone ──────────────────────────────────────

  private startBassDrone(): void {
    if (!this.ctx || !this.musicGain) return;

    // Main drone oscillator at A1 (~55Hz)
    this.bassDroneOsc = this.ctx.createOscillator();
    this.bassDroneGain = this.ctx.createGain();

    this.bassDroneOsc.type = 'sine';
    this.bassDroneOsc.frequency.value = 55;
    this.bassDroneGain.gain.value = 0.06;

    // LFO for slow frequency modulation (+/- 5Hz at 0.1Hz)
    this.bassDroneLfo = this.ctx.createOscillator();
    this.bassDroneLfoGain = this.ctx.createGain();

    this.bassDroneLfo.type = 'sine';
    this.bassDroneLfo.frequency.value = 0.1;
    this.bassDroneLfoGain.gain.value = 5;

    this.bassDroneLfo.connect(this.bassDroneLfoGain);
    this.bassDroneLfoGain.connect(this.bassDroneOsc.frequency);

    this.bassDroneOsc.connect(this.bassDroneGain);
    this.bassDroneGain.connect(this.musicGain);

    this.bassDroneLfo.start();
    this.bassDroneOsc.start();
  }

  // ── Music: Pad Layer ────────────────────────────────────────

  private startPadLayer(): void {
    if (!this.ctx || !this.musicGain) return;

    // Low-pass filter for warmth
    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 800;
    this.padFilter.Q.value = 1;

    this.padMixGain = this.ctx.createGain();
    this.padMixGain.gain.value = 0.03;

    this.padFilter.connect(this.padMixGain);
    this.padMixGain.connect(this.musicGain);

    // Minor chord tones: A2(110), C3(131), E3(165)
    const chordFreqs = [110, 131, 165];

    for (let i = 0; i < chordFreqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Alternate between saw and triangle for detuned character
      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = chordFreqs[i];
      // Slight detune for thickness
      osc.detune.value = (i - 1) * 6;

      gain.gain.value = 1.0;
      osc.connect(gain);
      gain.connect(this.padFilter!);

      osc.start();
      this.padOscillators.push(osc);
      this.padGains.push(gain);
    }

    // Slowly shift chord tones every 8 seconds
    this.padChordIndex = 0;
    const chordProgressions = [
      [110, 131, 165], // Am (A2, C3, E3)
      [98, 131, 165], // Dm-ish (G2#, C3, E3) — darker
      [104, 131, 156], // Ab dim-ish
      [110, 139, 165], // A something (A2, C#3-ish, E3)
    ];

    this.padChordTimer = setInterval(() => {
      if (!this.ctx || !this.musicPlaying) return;
      this.padChordIndex =
        (this.padChordIndex + 1) % chordProgressions.length;
      const chord = chordProgressions[this.padChordIndex];
      const t = this.ctx.currentTime;

      this.padOscillators.forEach((osc, i) => {
        if (i < chord.length) {
          osc.frequency.cancelScheduledValues(t);
          osc.frequency.setValueAtTime(osc.frequency.value, t);
          osc.frequency.linearRampToValueAtTime(chord[i], t + 2);
        }
      });
    }, 8000);
  }

  // ── Music: Rhythmic Pulse ───────────────────────────────────

  private startRhythmicPulse(): void {
    if (!this.ctx || !this.musicGain) return;

    this.pulseOsc = this.ctx.createOscillator();
    this.pulseFilter = this.ctx.createBiquadFilter();
    this.pulseGain = this.ctx.createGain();

    this.pulseOsc.type = 'square';
    this.pulseOsc.frequency.value = 55; // Low square wave

    this.pulseFilter.type = 'lowpass';
    this.pulseFilter.frequency.value = 400;
    this.pulseFilter.Q.value = 2;

    this.pulseGain.gain.value = 0; // Start silent, scheduler will gate it

    this.pulseOsc.connect(this.pulseFilter);
    this.pulseFilter.connect(this.pulseGain);
    this.pulseGain.connect(this.musicGain);

    this.pulseOsc.start();
    this.startPulseScheduler();
  }

  private startPulseScheduler(): void {
    if (!this.ctx) return;

    const scheduleAhead = 4; // schedule 4 beats ahead
    const tempo = this.pulseBaseTempo * (1 - this.musicIntensity * 0.2);

    // Schedule repeating gain gates
    const schedulePulses = () => {
      if (!this.ctx || !this.pulseGain || !this.musicPlaying) return;
      const t = this.ctx.currentTime;
      const vol = this.pulseBaseVolume + this.musicIntensity * 0.06;
      const beatDuration = tempo / 1000;

      for (let i = 0; i < scheduleAhead; i++) {
        const beatStart = t + i * beatDuration;
        const gateOn = beatStart;
        const gateOff = beatStart + beatDuration * 0.4;

        this.pulseGain.gain.setValueAtTime(vol, gateOn);
        this.pulseGain.gain.setValueAtTime(0, gateOff);
      }
    };

    schedulePulses();
    this.pulseTimer = setInterval(
      schedulePulses,
      tempo * scheduleAhead * 0.9
    );
  }

  private restartPulseScheduler(): void {
    if (this.pulseTimer !== null) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.musicPlaying) {
      this.startPulseScheduler();
    }
  }

  // ── Music: High Atmosphere ──────────────────────────────────

  private startAtmosphere(): void {
    if (!this.ctx || !this.musicGain) return;

    this.atmosphereGain = this.ctx.createGain();
    this.atmosphereGain.gain.value = 0.015;
    this.atmosphereGain.connect(this.musicGain);

    // Spawn random ethereal tones periodically
    const spawnTone = () => {
      if (!this.ctx || !this.atmosphereGain || !this.musicPlaying) return;

      const t = this.ctx.currentTime;
      const freq = 2000 + Math.random() * 2000; // 2000-4000 Hz
      const duration = 2 + Math.random() * 4; // 2-6 seconds

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      // Slight random detune for otherworldly feel
      osc.detune.value = (Math.random() - 0.5) * 30;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.5, t + duration * 0.3);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      osc.connect(gain);
      gain.connect(this.atmosphereGain!);

      osc.start(t);
      osc.stop(t + duration + 0.1);
    };

    // Spawn a tone every 3-7 seconds
    const scheduleNext = () => {
      if (!this.musicPlaying) return;
      const delay = 3000 + Math.random() * 4000;
      this.atmosphereTimer = setTimeout(() => {
        spawnTone();
        scheduleNext();
      }, delay);
    };

    // Start first tone soon
    setTimeout(() => spawnTone(), 1000);
    scheduleNext();
  }

  // ── Music Cleanup ───────────────────────────────────────────

  private cleanupMusic(): void {
    // Stop bass drone
    try {
      this.bassDroneOsc?.stop();
    } catch (_) {
      /* already stopped */
    }
    try {
      this.bassDroneLfo?.stop();
    } catch (_) {
      /* already stopped */
    }
    this.bassDroneOsc?.disconnect();
    this.bassDroneLfo?.disconnect();
    this.bassDroneLfoGain?.disconnect();
    this.bassDroneGain?.disconnect();
    this.bassDroneOsc = null;
    this.bassDroneLfo = null;
    this.bassDroneLfoGain = null;
    this.bassDroneGain = null;

    // Stop pad oscillators
    this.padOscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (_) {
        /* already stopped */
      }
      osc.disconnect();
    });
    this.padGains.forEach((g) => g.disconnect());
    this.padOscillators = [];
    this.padGains = [];
    this.padFilter?.disconnect();
    this.padMixGain?.disconnect();
    this.padFilter = null;
    this.padMixGain = null;
    if (this.padChordTimer !== null) {
      clearInterval(this.padChordTimer);
      this.padChordTimer = null;
    }

    // Stop rhythmic pulse
    try {
      this.pulseOsc?.stop();
    } catch (_) {
      /* already stopped */
    }
    this.pulseOsc?.disconnect();
    this.pulseFilter?.disconnect();
    this.pulseGain?.disconnect();
    this.pulseOsc = null;
    this.pulseFilter = null;
    this.pulseGain = null;
    if (this.pulseTimer !== null) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }

    // Stop atmosphere
    if (this.atmosphereTimer !== null) {
      clearTimeout(this.atmosphereTimer);
      this.atmosphereTimer = null;
    }
    this.atmosphereGain?.disconnect();
    this.atmosphereGain = null;

    // Disconnect master music gain
    this.musicGain?.disconnect();
    this.musicGain = null;
  }

  // ── Volume Controls ───────────────────────────────────────────

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setMasterVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getMasterVolume(): number {
    return this.volume;
  }

  setMusicVolume(value: number): void {
    this.musicMasterVolume = Math.max(0, Math.min(1, value)) * 0.15;
    if (this.musicGain && this.ctx && !this.muted) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(this.musicMasterVolume, t + 0.1);
    }
  }

  getMusicVolume(): number {
    return this.musicMasterVolume / 0.15;
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, value));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  mute(): void {
    this.muted = true;
    if (this.musicGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(0, t + 0.1);
    }
  }

  unmute(): void {
    this.muted = false;
    if (this.musicGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(
        this.musicMasterVolume,
        t + 0.1
      );
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  getVolume(): number {
    return this.volume;
  }
}
