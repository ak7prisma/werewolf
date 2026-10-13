export type WinKind = 'village' | 'werewolf';

const MOTIF_INTERVAL = 5200;
const HEARTBEAT_INTERVAL = 2600;

/**
 * Small Web Audio synthesizer. Produces an eerie looping background track plus
 * one-shot SFX (card reveal, victory) without shipping any audio assets.
 *
 * The AudioContext is created lazily and only resumed from a user gesture so it
 * plays nicely with browser autoplay policies.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private motifTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private bgmStarted = false;
  private muted = false;

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;

    const AudioCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      throw new Error('Web Audio API tidak didukung oleh browser ini.');
    }

    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(ctx.destination);

    const bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.bgmGain = bgmGain;
    return ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.startBackground();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Starts the looping ambient track. Safe to call multiple times. */
  startBackground(): void {
    if (this.bgmStarted) return;
    const ctx = this.ensureContext();
    if (ctx.state !== 'running') return;

    this.bgmStarted = true;
    const now = ctx.currentTime;

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.16, now + 4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 5;
    droneGain.connect(filter);
    filter.connect(this.bgmGain!);

    const droneOsc1 = ctx.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.value = 55;
    const droneOsc2 = ctx.createOscillator();
    droneOsc2.type = 'sawtooth';
    droneOsc2.frequency.value = 55.7;
    const droneOsc3 = ctx.createOscillator();
    droneOsc3.type = 'sine';
    droneOsc3.frequency.value = 82.4;

    const droneGain2 = ctx.createGain();
    droneGain2.gain.value = 0.5;
    droneOsc3.connect(droneGain2);
    droneGain2.connect(droneGain);
    droneOsc1.connect(droneGain);
    droneOsc2.connect(droneGain);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const startAt = now;
    for (const osc of [droneOsc1, droneOsc2, droneOsc3, lfo]) osc.start(startAt);

    this.bgmGain!.gain.setValueAtTime(0.0001, now);
    this.bgmGain!.gain.linearRampToValueAtTime(0.55, now + 5);

    this.motifTimer = window.setInterval(() => this.playMotif(), MOTIF_INTERVAL);
    this.heartbeatTimer = window.setInterval(() => this.playHeartbeat(), HEARTBEAT_INTERVAL);
  }

  private playMotif(): void {
    if (!this.ctx || !this.bgmGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.02;
    const tones = [220, 233.08, 174.61, 196, 207.65, 155.56];
    const base = tones[Math.floor(Math.random() * tones.length)];
    this.tone(base, now, 2.8, 'sine', 0.05, this.bgmGain);
    this.tone(base * 1.006, now + 0.04, 2.8, 'triangle', 0.035, this.bgmGain);
    if (Math.random() > 0.55) {
      this.tone(base / 2, now + 0.3, 2.2, 'sine', 0.04, this.bgmGain);
    }
  }

  private playHeartbeat(): void {
    if (!this.ctx || !this.bgmGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.02;
    this.kick(58, now, 0.16, 0.28, this.bgmGain);
    this.kick(52, now + 0.26, 0.14, 0.2, this.bgmGain);
  }

  private kick(freq: number, start: number, dur: number, peak: number, dest: AudioNode): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, start);
    osc.frequency.exponentialRampToValueAtTime(freq, start + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    dest: AudioNode,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  /** Card reveal SFX. Deliberately identical for every role so nothing leaks. */
  playCard(): void {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime + 0.01;

    const source = ctx.createBufferSource();
    source.buffer = this.getNoise(ctx);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.value = 1.1;
    bandpass.frequency.setValueAtTime(420, now);
    bandpass.frequency.exponentialRampToValueAtTime(3200, now + 0.28);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.master!);
    source.start(now);
    source.stop(now + 0.42);

    this.tone(1250, now, 0.1, 'triangle', 0.12, this.master!);
    this.tone(150, now, 0.22, 'sine', 0.22, this.master!);
  }

  playWin(kind: WinKind): void {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime + 0.02;

    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(0.12, now, 0.2);
    }

    if (kind === 'village') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        this.tone(freq, now + i * 0.16, 1.1, 'triangle', 0.18, this.master!);
        this.tone(freq * 2, now + i * 0.16 + 0.02, 0.9, 'sine', 0.06, this.master!);
      });
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq) => this.tone(freq, now + 0.7, 2.4, 'sine', 0.09, this.master!));
      return;
    }

    const notes = [146.83, 138.59, 123.47, 103.83];
    notes.forEach((freq, i) => {
      this.tone(freq, now + i * 0.22, 1.4, 'sawtooth', 0.13, this.master!);
      this.tone(freq / 2, now + i * 0.22, 1.4, 'sine', 0.1, this.master!);
    });

    const howl = ctx.createOscillator();
    howl.type = 'sawtooth';
    const howlGain = ctx.createGain();
    howl.frequency.setValueAtTime(320, now + 0.1);
    howl.frequency.linearRampToValueAtTime(520, now + 0.9);
    howl.frequency.linearRampToValueAtTime(240, now + 2.1);
    howlGain.gain.setValueAtTime(0.0001, now + 0.1);
    howlGain.gain.linearRampToValueAtTime(0.09, now + 0.6);
    howlGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    const howlFilter = ctx.createBiquadFilter();
    howlFilter.type = 'lowpass';
    howlFilter.frequency.value = 900;
    howl.connect(howlFilter);
    howlFilter.connect(howlGain);
    howlGain.connect(this.master!);
    howl.start(now + 0.1);
    howl.stop(now + 2.5);
  }

  dispose(): void {
    if (this.motifTimer !== null) window.clearInterval(this.motifTimer);
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.motifTimer = null;
    this.heartbeatTimer = null;
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.bgmStarted = false;
  }
}
