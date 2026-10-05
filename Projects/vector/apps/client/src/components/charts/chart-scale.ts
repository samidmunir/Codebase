// Scales and ticks for the admin charts.

/** Clean y-axis ticks from 0 up to at least `max` (1, 2 or 5 × a power of ten apart). */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const ticks: number[] = [];
  for (let value = 0; value < max + step / 2; value += step) ticks.push(round(value));
  if (ticks.at(-1)! < max) ticks.push(round(ticks.at(-1)! + step));
  return ticks;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** 1,284 · 12.9K · 4.2M */
export function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${trim(value / 1e6)}M`;
  if (abs >= 1e4) return `${trim(value / 1e3)}K`;
  if (Number.isInteger(value)) return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

const trim = (value: number) => value.toFixed(1).replace(/\.0$/, '');

/** "Oct 7" for a YYYY-MM-DD bucket start. */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Which of `n` x positions get a label, about `want` of them, always the first and last. */
export function labelledIndexes(n: number, want = 6): Set<number> {
  if (n <= want) return new Set(Array.from({ length: n }, (_, i) => i));
  const every = Math.ceil((n - 1) / (want - 1));
  const shown = new Set<number>();
  for (let i = 0; i < n; i += every) shown.add(i);
  // The last label replaces one that would crowd it.
  for (const i of shown) if (n - 1 - i < every / 2) shown.delete(i);
  shown.add(n - 1);
  return shown;
}
