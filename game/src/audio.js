// Synthesised sound: no audio files, everything is a WebAudio oscillator or
// a burst of filtered noise, so the game ships no assets and plays offline.
// The context is created on the first user gesture (start / jump), never at
// boot, so browsers with autoplay policies stay quiet until the player acts.
export function createAudio() {
  let ctx = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      } catch {
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = 0) {
    const c = ensure();
    if (!c || !enabled) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, gain, freq, when = 0) {
    const c = ensure();
    if (!c || !enabled) return;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    /** Call from any user gesture so the context exists before the first sound. */
    unlock() {
      ensure();
    },
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    jump() {
      tone(320, 0.16, 'sine', 0.12, 0, 620);
    },
    land() {
      noise(0.08, 0.1, 500);
    },
    gobble() {
      // The turkey's own voice: four fast descending clucks.
      for (let i = 0; i < 4; i += 1) tone(520 - i * 90, 0.09, 'square', 0.07, i * 0.07, 300 - i * 50);
    },
    pickup() {
      tone(660, 0.1, 'sine', 0.12, 0, 990);
      tone(990, 0.14, 'sine', 0.1, 0.07);
    },
    pie() {
      tone(523, 0.12, 'triangle', 0.14);
      tone(659, 0.12, 'triangle', 0.14, 0.1);
      tone(784, 0.2, 'triangle', 0.14, 0.2);
    },
    hit() {
      noise(0.22, 0.25, 900);
      tone(140, 0.25, 'sawtooth', 0.16, 0, 60);
    },
    warn() {
      tone(440, 0.12, 'square', 0.08, 0, 330);
      tone(440, 0.12, 'square', 0.08, 0.16, 330);
    },
    stage() {
      tone(392, 0.12, 'triangle', 0.12);
      tone(523, 0.12, 'triangle', 0.12, 0.1);
      tone(659, 0.18, 'triangle', 0.12, 0.2);
    },
    caught() {
      // A short descending sting: dinner is served.
      tone(392, 0.22, 'sawtooth', 0.12, 0, 370);
      tone(311, 0.22, 'sawtooth', 0.12, 0.2, 294);
      tone(233, 0.45, 'sawtooth', 0.12, 0.4, 175);
    },
    escaped() {
      // A little fanfare: the turkey got away.
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
      tone(1319, 0.4, 'triangle', 0.12, 0.48);
    },
  };
}
