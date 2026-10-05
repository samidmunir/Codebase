// Dates and times for people (in the viewer's time zone).

/** '3 Oct 2026, 14:05' in the viewer's time zone, or '–'. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** '3 Oct 2026'. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** 'just now', '5 min ago', '3 h ago', '2 days ago', or the date. */
export function formatAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Never';
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}
