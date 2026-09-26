// Spoken forms of ATC values, following FAA Order JO 7110.65 conventions.

const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
const SMALL = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const PHONETIC: Record<string, string> = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
};

/** '270' -> 'two seven zero' (9 is 'niner'). */
export function spellDigits(value: string): string {
  return [...value].map((c) => DIGITS[Number(c)] ?? c).join(' ');
}

/** 0..99 as words: 24 -> 'twenty-four'. */
function wordsUnder100(n: number): string {
  if (n < 20) return SMALL[n]!;
  const tens = TENS[Math.floor(n / 10)]!;
  return n % 10 === 0 ? tens : `${tens}-${SMALL[n % 10]}`;
}

/** Two-digit group, with a leading zero spoken as 'zero': 5 -> 'zero five'. */
function group(n: number): string {
  return n < 10 ? `zero ${DIGITS[n]}` : wordsUnder100(n);
}

/**
 * Flight numbers in group form: 52 -> 'fifty-two', 426 -> 'four twenty-six',
 * 1024 -> 'ten twenty-four', 1205 -> 'twelve zero five', 2000 -> 'two thousand'.
 */
export function flightNumberWords(digits: string): string {
  const n = Number(digits);
  if (digits.length <= 2) return wordsUnder100(n);
  if (digits.length === 3) {
    const rest = n % 100;
    return rest === 0
      ? `${DIGITS[Math.floor(n / 100)]} hundred`
      : `${DIGITS[Math.floor(n / 100)]} ${group(rest)}`;
  }
  if (digits.length === 4 && !digits.startsWith('0')) {
    const [high, low] = [Math.floor(n / 100), n % 100];
    if (low === 0 && high % 10 === 0) return `${wordsUnder100(high / 10)} thousand`;
    return `${wordsUnder100(high)} ${group(low)}`;
  }
  return spellDigits(digits);
}

/** 'JBU1024' with telephony 'JetBlue' -> 'JetBlue ten twenty-four'. Without telephony, letters are spoken phonetically. */
export function spokenCallsign(callsign: string, telephony?: string): string {
  const match = /^([A-Z]{3})(\d{1,4})([A-Z]{0,2})$/.exec(callsign);
  if (!match) return [...callsign].map((c) => PHONETIC[c] ?? DIGITS[Number(c)] ?? c).join(' ');
  const [, airline, number, suffix] = match;
  const name = telephony ?? [...airline!].map((c) => PHONETIC[c]).join(' ');
  const letters = [...suffix!].map((c) => PHONETIC[c]).join(' ');
  return [name, flightNumberWords(number!), letters].filter(Boolean).join(' ');
}

/** Headings are three digits, with north as 360: 5 -> 'zero zero five', 0 -> 'three six zero'. */
export function headingWords(headingDeg: number): string {
  const rounded = Math.round(headingDeg) % 360 || 360;
  return spellDigits(String(rounded).padStart(3, '0'));
}

/**
 * Altitudes: 4000 -> 'four thousand', 11000 -> 'one one thousand',
 * 3500 -> 'three thousand five hundred', 19000 -> 'flight level one niner zero'.
 */
export function altitudeWords(altitudeFt: number): string {
  if (altitudeFt >= 18_000)
    return `flight level ${spellDigits(String(Math.round(altitudeFt / 100)))}`;
  const thousands = Math.floor(altitudeFt / 1000);
  const hundreds = Math.round((altitudeFt % 1000) / 100);
  const parts: string[] = [];
  if (thousands > 0) parts.push(`${spellDigits(String(thousands))} thousand`);
  if (hundreds > 0) parts.push(`${DIGITS[hundreds]} hundred`);
  return parts.join(' ') || 'zero';
}

/** 210 -> 'two one zero knots' */
export function speedWords(kts: number): string {
  return `${spellDigits(String(Math.round(kts)))} knots`;
}

/** 119.1 -> 'one one niner point one', 132.475 -> 'one three two point four seven five'. */
export function frequencyWords(mhz: number): string {
  const [whole, fraction] = mhz.toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0').split('.');
  return `${spellDigits(whole!)} point ${spellDigits(fraction!)}`;
}

/** Runways drop a leading zero: '04L' -> 'four left', '22R' -> 'two two right', '13' -> 'one three'. */
export function runwayWords(runway: string): string {
  const match = /^0?(\d{1,2})([LRC]?)$/.exec(runway);
  if (!match) return runway;
  const side = { L: 'left', R: 'right', C: 'center' }[match[2] as 'L' | 'R' | 'C'];
  return [spellDigits(match[1]!), side].filter(Boolean).join(' ');
}

/** Frequencies as written in the log: 119.1, 132.475. */
export function formatFrequency(mhz: number): string {
  return mhz.toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0');
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Procedure names as spoken: 'PHLBO4' -> 'PHLBO four', 'TNNIS6' -> 'TNNIS six'. */
export function procedureWords(name: string): string {
  return name.replace(/(\d)$/, (digit) => ` ${spellDigits(digit)}`);
}
