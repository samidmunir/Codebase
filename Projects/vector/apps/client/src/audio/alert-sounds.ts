// Conflict Alert tones, synthesized with Web Audio (no audio files).
// Browsers only allow audio after a user gesture, so the context is created
// on the first pointer or key press.

type Tone = { frequencyHz: number; startSec: number; durationSec: number };

const PREDICTED: Tone[] = [{ frequencyHz: 740, startSec: 0, durationSec: 0.16 }];
const LOSS: Tone[] = [0, 1, 2, 3].map((i) => ({
  frequencyHz: i % 2 === 0 ? 880 : 660,
  startSec: i * 0.18,
  durationSec: 0.15,
}));

let context: AudioContext | undefined;

function unlock(): void {
  if (context) return;
  try {
    context = new AudioContext();
  } catch {
    // Audio unavailable: alerts stay visual only.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

function play(tones: Tone[], volumePercent: number): void {
  if (!context || volumePercent <= 0) return;
  if (context.state === 'suspended') void context.resume();
  const now = context.currentTime;
  const peak = 0.25 * (volumePercent / 100);
  for (const tone of tones) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = tone.frequencyHz;
    const start = now + tone.startSec;
    const end = start + tone.durationSec;
    // Short fades avoid clicks.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.01);
    gain.gain.setValueAtTime(peak, end - 0.02);
    gain.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }
}

export const alertSounds = {
  predicted: (volumePercent: number) => play(PREDICTED, volumePercent),
  loss: (volumePercent: number) => play(LOSS, volumePercent),
};
