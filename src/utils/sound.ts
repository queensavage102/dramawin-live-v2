const SOUND_MUTE_KEY = 'dramawin_sound_muted';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

export function unlockAudioEngine(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    // Ignore audio restrictions
  }
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(SOUND_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SOUND_MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignore storage restriction
  }
}

/**
 * Crisp two-tone cash register / gold coin clink chime (B5 -> E6 + E7 harmonic) using Web Audio API.
 */
export function playCoinChime(muted = isSoundMuted()): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Coin Clink 1: B5 (987.77 Hz) + B6 overtone
    const osc1 = ctx.createOscillator();
    const osc1Hi = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1Hi.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    osc1Hi.frequency.setValueAtTime(1975.53, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    osc1Hi.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1Hi.start(now);
    osc1.stop(now + 0.15);
    osc1Hi.stop(now + 0.15);

    // Cash Register Bell: E6 (1318.51 Hz) + E7 harmonic shimmer
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc3.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.065);
    osc3.frequency.setValueAtTime(2637.02, now + 0.065);

    gain2.gain.setValueAtTime(0.001, now + 0.065);
    gain2.gain.exponentialRampToValueAtTime(0.24, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0008, now + 0.52);

    osc2.connect(gain2);
    osc3.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.065);
    osc3.start(now + 0.065);
    osc2.stop(now + 0.54);
    osc3.stop(now + 0.54);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/**
 * Multi-coin treasure pot cascade + cash-register cha-ching sound when pot fills top progress bar.
 */
export function playCoinPotCashChime(muted = isSoundMuted()): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const coinNotes = [
      { freq: 1174.66, delay: 0.0, dur: 0.11 }, // D6 coin clink
      { freq: 1479.98, delay: 0.055, dur: 0.12 }, // F#6 coin clink
      { freq: 1760.0, delay: 0.11, dur: 0.14 }, // A6 coin clink
      { freq: 2349.32, delay: 0.165, dur: 0.45 }, // D7 cash register shimmer
    ];

    coinNotes.forEach(({ freq, delay, dur }, idx) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === 3 ? 'sine' : 'triangle';
      overtone.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      overtone.frequency.setValueAtTime(freq * 1.5, now + delay);

      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.exponentialRampToValueAtTime(idx === 3 ? 0.24 : 0.16, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + delay + dur);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      overtone.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
      overtone.stop(now + delay + dur + 0.02);
    });
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * Celebratory gold-chord fanfare for R3 Progress Bar Boost / Pool wins.
 */
export function playVictoryFanfare(muted = isSoundMuted()): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.56);
    });
  } catch {
    // Ignore audio context autoplay restrictions
  }
}
