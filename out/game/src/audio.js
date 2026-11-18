// Sound, all generated live with WebAudio — no audio files. An engine hum that
// follows the car's speed, a two-tone police siren, gunshots, a cash chime and a
// simple bass-and-hats music loop that starts after the first user gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let muted = false;
  let beat = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  function setEngine(speed, driving) {
    if (!ctx || !engineOsc) return;
    engineOsc.frequency.value = 50 + Math.abs(speed) * 6;
    engineGain.gain.value = driving ? 0.05 + Math.abs(speed) * 0.002 : 0.0;
  }

  function blip(freq, dur, type, gainValue, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function gunshot() {
    if (!ensure()) return;
    if (!ctx) return;
    const dur = 0.14;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(gain);
    gain.connect(master);
    src.start();
    blip(160, 0.1, 'square', 0.18);
  }

  function cash() {
    if (!ensure()) return;
    blip(880, 0.12, 'sine', 0.25);
    blip(1318, 0.2, 'sine', 0.25, 0.09);
  }

  function siren() {
    if (!ensure()) return;
    blip(700, 0.5, 'sine', 0.10);
    blip(950, 0.5, 'sine', 0.10, 0.5);
  }

  function startMusic() {
    if (!ensure() || musicTimer) return;
    const bassNotes = [55, 55, 65.4, 49];
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const note = bassNotes[beat % bassNotes.length];
      blip(note, 0.42, 'triangle', 0.22);
      blip(note * 2, 0.16, 'sine', 0.08, 0.22);
      if (beat % 2 === 0) blip(520, 0.06, 'square', 0.03, 0.1);
      beat += 1;
    }, 460);
  }

  return {
    ensure, startMusic, setMuted, setEngine, gunshot, cash, siren,
    get isMuted() { return muted; },
  };
}
