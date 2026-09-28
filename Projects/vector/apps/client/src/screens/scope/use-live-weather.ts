import { useEffect } from 'react';
import { fetchMetars } from '../../api/weather-api';
import type { ScopeSession } from '../../sim/scope-session';

/**
 * Keeps a live-weather session's wind current: checks for new reports when
 * the scope opens (unless the setup screen just fetched them) and then every
 * `weather.livePollMin` minutes of real time.
 */
export function useLiveWeather(session: ScopeSession): void {
  useEffect(() => {
    if (!session.usesLiveWeather) return;
    const refresh = () => void session.refreshLiveWeather(fetchMetars);
    if (session.getStatus().liveWeather.state !== 'ok') refresh();
    const timer = window.setInterval(
      refresh,
      session.engine.settings['weather.livePollMin'] * 60_000,
    );
    return () => window.clearInterval(timer);
  }, [session]);
}
