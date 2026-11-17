// Sound only: every effect is synthesised with WebAudio, so the game ships no
// audio files and makes no network request. The context is created on the
// first user gesture; until then every call is a safe no-op.

export function createAudio() {
  let context = null;
  let muted = false;
  // Background music: a slow dark-ambient loop, synthesised, no files.
  // Chords: Am - F - C - G, one 4 s bar each; a soft pentatonic arpeggio
  // floats over the pad. Everything is scheduled ahead in small slices,
  // so the loop has no gap, and the whole thing is quiet (musicGain 0.05)
  // so it never drowns the effects. If WebAudio is missing, every music
  // call is a silent no-op and the game plays on without it.
  let musicGain = null;
  let musicTimer = null;
  let nextChordAt = 0;
  let nextArpAt = 0;
  let chordIndex = 0;
  let arpStep = 0;
  const CHORDS = [
    [110.0, 130.81, 164.81], // Am
    [87.31, 110.0, 130.81], // F
    [130.81, 164.81, 196.0], // C
    [98.0, 123.47, 146.83], // G
  ];
  const ARP = [440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25];
  const BAR = 4;

  function applyMusicMute() {
    if (musicGain && context) {
      try { musicGain.gain.setTargetAtTime(muted ? 0 : 0.05, context.currentTime, 0.1); } catch { /* ignore */ }
    }
  }

  function padChord(freqs, when) {
    try {
      for (const freq of freqs) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, when);
        // Slow swell in, slow release: the pad never clicks or gaps.
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.linearRampToValueAtTime(0.05, when + 1.5);
        gain.gain.setValueAtTime(0.05, when + BAR - 1.5);
        gain.gain.linearRampToValueAtTime(0.0001, when + BAR + 0.8);
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, when);
        osc.connect(gain).connect(filter).connect(musicGain);
        osc.start(when);
        osc.stop(when + BAR + 1);
      }
    } catch { /* music is decoration; never break the game */ }
  }

  function arpNote(freq, when) {
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.06, when + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.9);
      osc.connect(gain).connect(musicGain);
      osc.start(when);
      osc.stop(when + 1);
    } catch { /* ignore */ }
  }

  function scheduleMusic() {
    if (!context || !musicGain) return;
    try {
      const ahead = context.currentTime + 0.8;
      while (nextChordAt < ahead) {
        padChord(CHORDS[chordIndex % CHORDS.length], Math.max(nextChordAt, context.currentTime + 0.05));
        chordIndex += 1;
        nextChordAt += BAR;
      }
      while (nextArpAt < ahead) {
        arpNote(ARP[arpStep % ARP.length], Math.max(nextArpAt, context.currentTime + 0.05));
        arpStep += 1;
        nextArpAt += 0.5;
      }
    } catch { /* ignore */ }
  }

  function startMusic() {
    const ctx = ensure();
    if (!ctx || musicTimer) return;
    try {
      if (!musicGain) {
        musicGain = ctx.createGain();
        musicGain.gain.setValueAtTime(muted ? 0 : 0.05, ctx.currentTime);
        musicGain.connect(ctx.destination);
      }
      const now = ctx.currentTime + 0.1;
      nextChordAt = now;
      nextArpAt = now;
      chordIndex = 0;
      arpStep = 0;
      scheduleMusic();
      musicTimer = setInterval(scheduleMusic, 250);
    } catch { /* no music, game continues silently */ }
  }

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
    get musicPlaying() { return musicTimer !== null; },
    toggleMute() { muted = !muted; applyMusicMute(); return muted; },
    startMusic() { startMusic(); },
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
