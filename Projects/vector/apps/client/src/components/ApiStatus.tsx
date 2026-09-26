import { useEffect, useState } from 'react';
import { fetchReadiness } from '../api/health';

type Status = 'checking' | 'online' | 'degraded' | 'offline';

const LABELS: Record<Status, string> = {
  checking: 'Checking systems',
  online: 'All systems online',
  degraded: 'Database unavailable',
  offline: 'Server offline',
};

const POLL_INTERVAL_MS = 10_000;

export function ApiStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const controller = new AbortController();

    async function check() {
      try {
        const readiness = await fetchReadiness(controller.signal);
        setStatus(readiness.status === 'ready' ? 'online' : 'degraded');
      } catch {
        if (!controller.signal.aborted) setStatus('offline');
      }
    }

    void check();
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="api-status" data-status={status} role="status">
      <span className="api-status__dot" aria-hidden="true" />
      {LABELS[status]}
    </div>
  );
}
