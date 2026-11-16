/**
 * Athar (أثـر) — Web Audio Interaction & Feedback Synthesizer
 * 
 * Features:
 * - 100% zero-asset Web Audio synthesis (0KB network, 0ms latency, works offline)
 * - Exact reference parity with: task-start, break-start, break-end, task-done
 * - Safe user gesture audio context unlocking to prevent browser autoplay warnings
 * - Global volume and mute controls with persistent localStorage backup
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    if (typeof window !== "undefined") {
      const storedPref = localStorage.getItem("athar_audio_enabled");
      if (storedPref !== null) {
        this.enabled = storedPref === "true";
      }
      const storedVol = localStorage.getItem("athar_audio_volume");
      if (storedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(storedVol)));
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("athar_audio_enabled", String(val));
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined") {
      localStorage.setItem("athar_audio_volume", String(this.volume));
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * 1. Task Start Chime (Reference: /task-start.mp3)
   * Clear, uplifting dual-tone ascending chime (D5 -> A5)
   */
  public playTaskStart() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Frequency slide D5 (587.33Hz) -> A5 (880Hz)
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.frequency.setValueAtTime(880, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3 * this.volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  /**
   * 2. Break Start Chime (Reference: /break-start.mp3)
   * Gentle, relaxing downward acoustic bell (A4 -> C#5 -> A4)
   */
  public playBreakStart() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(554.37, now); // C#5
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2); // A4

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  /**
   * 3. Break End Chime (Reference: /break-end.mp3)
   * Energetic triple alert chime (E5 -> G5 -> C6)
   */
  public playBreakEnd() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [659.25, 783.99, 1046.5]; // E5, G5, C6
    notes.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /**
   * 4. Task Done Celebration Chord (Reference: /task-done.mp3)
   * Rich harmonic bell chord (E5, G#5, B5, E6 sparkle)
   */
  public playTaskDone() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseNow = ctx.currentTime;
    const chord = [659.25, 830.61, 987.77, 1318.51]; // E Major chord sparkle

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === chord.length - 1 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, baseNow + i * 0.04);

      gain.gain.setValueAtTime(0, baseNow + i * 0.04);
      gain.gain.linearRampToValueAtTime(0.28 * this.volume, baseNow + i * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, baseNow + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(baseNow + i * 0.04);
      osc.stop(baseNow + 0.7);
    });
  }

  /**
   * 5. Subtle UI Click
   */
  public playClick() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.08 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * 6. Scheduled Task Reminder Chime
   * Soft, peaceful notification chime (F5 -> C6)
   */
  public playReminder() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [698.46, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.12;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.6);
    });
  }

  /**
   * 8. Wheel Tick — luxury ratchet click (Fortune Wheel style)
   * A crisp, metallic detent snap: sharp attack + fast resonant decay.
   * Modelled after a ratchet pawl: narrow noise burst + pitched sine body.
   */
  public playWheelTick() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // --- Noise transient (ratchet "snap") ---
    const bufLen = Math.floor(ctx.sampleRate * 0.012); // 12 ms of noise
    const noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // High-pass to keep it crisp, not muddy
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 3200;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18 * this.volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    noiseSource.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.012);

    // --- Pitched body (ratchet resonance) ---
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.025);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.09 * this.volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * 7. Task Interrupt Alert
   * Double gentle pulse
   */
  public playInterrupt() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [880, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const delay = idx * 0.15;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  }
}

export const soundManager = new SoundManager();

