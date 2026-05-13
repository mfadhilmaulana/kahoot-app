// Web Audio API sound effects — no external files needed
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.22, delay = 0) {
  try {
    const ac = getCtx();
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch {/* ignore in SSR / blocked AudioContext */}
}

export function playCorrect() {
  tone(523.25, 0.1, "square", 0.2, 0);
  tone(659.25, 0.1, "square", 0.2, 0.1);
  tone(783.99, 0.18, "square", 0.2, 0.2);
  tone(1046.5, 0.22, "triangle", 0.18, 0.35);
}

export function playWrong() {
  tone(220, 0.08, "square", 0.18, 0);
  tone(185, 0.14, "square", 0.18, 0.07);
  tone(155, 0.18, "square", 0.15, 0.18);
}

export function playTick() {
  tone(880, 0.04, "square", 0.08, 0);
}

export function playJoin() {
  tone(440, 0.08, "triangle", 0.15, 0);
  tone(554, 0.12, "triangle", 0.15, 0.08);
}

export function playStart() {
  [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => {
    tone(f, 0.14, "square", 0.18, i * 0.1);
  });
}

export function playEnd() {
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
    tone(f, 0.2, "triangle", 0.18, i * 0.13);
  });
}

export function playPoll() {
  tone(392, 0.1, "triangle", 0.15, 0);
  tone(494, 0.14, "triangle", 0.15, 0.1);
}
