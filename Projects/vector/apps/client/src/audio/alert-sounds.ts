// Conflict Alert tones and interface sounds, synthesized with Web Audio (no audio files).
// Browsers only allow audio after a user gesture, so the context is created
// on the first pointer or key press.

type Tone = { frequencyHz: number; startSec: number; durationSec: number };

interface Voice {
  wave: OscillatorType;
  /** Loudness at 100% volume, 0–1. */
  peak: number;
}

const ALERT_VOICE: Voice = { wave: 'square', peak: 0.25 };
/** Interface sounds are soft sine blips, well below the alerts. */
const UI_VOICE: Voice = { wave: 'sine', peak: 0.08 };

const SELECT: Tone[] = [{ frequencyHz: 1_320, startSec: 0, durationSec: 0.04 }];
const TRANSMIT: Tone[] = [
  { frequencyHz: 990, startSec: 0, durationSec: 0.05 },
  { frequencyHz: 1_480, startSec: 0.06, durationSec: 0.05 },
];

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

function play(tones: Tone[], volumePercent: number, voice: Voice = ALERT_VOICE): void {
  if (!context || volumePercent <= 0) return;
  if (context.state === 'suspended') void context.resume();
  const now = context.currentTime;
  const peak = voice.peak * (volumePercent / 100);
  for (const tone of tones) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = voice.wave;
    oscillator.frequency.value = tone.frequencyHz;
    const start = now + tone.startSec;
    const end = start + tone.durationSec;
    // Short fades avoid clicks.
    gain.gain.setValueAtTime(0, start);
    const fade = Math.min(0.01, tone.durationSec / 4);
    gain.gain.linearRampToValueAtTime(peak, start + fade);
    gain.gain.setValueAtTime(peak, end - fade * 2);
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

/** Subtle interface feedback (the audio.uiSounds setting). */
export const uiSounds = {
  select: (volumePercent: number) => play(SELECT, volumePercent, UI_VOICE),
  transmit: (volumePercent: number) => play(TRANSMIT, volumePercent, UI_VOICE),
};
