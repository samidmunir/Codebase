/** Simulated time in a session: '45m', '1h 12m'. */
export function formatSimDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** When a session was saved, relative to now: 'just now', '5 min ago', 'yesterday', 'Sep 3'. */
export function formatSavedAt(iso: string, now: Date = new Date()): string {
  const saved = new Date(iso);
  const minutes = Math.floor((now.getTime() - saved.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'yesterday';
  return saved.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
