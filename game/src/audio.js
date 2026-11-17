// Sound only: every effect is synthesised with WebAudio, so the game ships no
// audio files and makes no network request. The context is created on the
// first user gesture; until then every call is a safe no-op.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
      return context;
    } catch {
      return null;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* sound is decoration; never break the game */ }
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    shoot() { tone(880, 0.07, 'square', 0.05, 440); },
    hit() { tone(220, 0.08, 'sawtooth', 0.06, 110); },
    kill() { tone(520, 0.12, 'triangle', 0.08, 180); },
    pickup() { tone(1040, 0.09, 'sine', 0.07, 1560); },
    hurt() { tone(160, 0.25, 'sawtooth', 0.1, 60); },
    dash() { tone(300, 0.12, 'sine', 0.06, 900); },
    nova() { tone(220, 0.4, 'sine', 0.12, 1320); },
    wave() { tone(392, 0.15, 'triangle', 0.08); setTimeout(() => tone(523, 0.2, 'triangle', 0.08), 140); },
    upgrade() { tone(523, 0.12, 'triangle', 0.08); setTimeout(() => tone(784, 0.18, 'triangle', 0.08), 110); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.09), i * 150)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.08), i * 170)); },
  };
}
