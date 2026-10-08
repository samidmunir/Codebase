import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Pulse } from '@vector/shared';
import { getPulse } from '../../api/pulse-api';
import { formatRp } from '../scope/score-format';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Real numbers from pilots' sessions (those that count), and the top controllers.
 * Hidden until there's enough to show (the server decides; see PULSE_MINIMUMS).
 */
export function PulseSection() {
  const [pulse, setPulse] = useState<Pulse>();

  useEffect(() => {
    let current = true;
    getPulse()
      .then((next) => current && setPulse(next))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  if (!pulse || (!pulse.totals && !pulse.top)) return null;
  const { totals, top } = pulse;
  const weekly = (totals ?? top)?.period === 'week';
  const numbers = totals
    ? [
        { value: totals.landed, label: 'aircraft landed' },
        { value: totals.sessions, label: 'sessions controlled' },
        { value: totals.pilots, label: totals.pilots === 1 ? 'pilot' : 'pilots' },
        {
          value: totals.hours,
          label: totals.hours === 1 ? 'hour on frequency' : 'hours on frequency',
        },
      ]
    : [];

  return (
    <section className="landing-section landing-pulse" aria-labelledby="pulse-title">
      <p className="hero__eyebrow" data-reveal>
        <span className="landing-hero__pulse" aria-hidden="true" /> On the frequency
      </p>
      <h2 id="pulse-title" className="landing-section__title" data-reveal>
        {weekly ? 'This week on Vector' : 'Since the beta began'}
      </h2>
      {numbers.length > 0 && (
        <dl className="landing-pulse__numbers" data-reveal>
          {numbers.map((number) => (
            <div key={number.label}>
              <dt>{number.label}</dt>
              <dd>{number.value.toLocaleString('en-US')}</dd>
            </div>
          ))}
        </dl>
      )}
      {top && (
        <div className="landing-pulse__top" data-reveal>
          <h3>
            Top controllers {top.period === 'week' ? 'this week' : 'of all time'}
            <span className="landing-pulse__note"> · career RP, verified sessions</span>
          </h3>
          <ol>
            {top.pilots.map((pilot) => (
              <li key={pilot.handle}>
                <Link to={`/pilots/${pilot.handle}`} className="landing-pulse__pilot">
                  <span className="landing-pulse__rank" data-rank={pilot.rank}>
                    {pilot.rank}
                  </span>
                  <span className="landing-pulse__avatar" aria-hidden="true">
                    {initials(pilot.displayName)}
                  </span>
                  <span className="landing-pulse__who">
                    <strong>{pilot.displayName}</strong>
                    <span>@{pilot.handle}</span>
                  </span>
                  <span className="landing-pulse__rp">{formatRp(pilot.value)}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="landing-roadmap__more">
            <Link to="/records">See the records →</Link>
          </p>
        </div>
      )}
    </section>
  );
}
