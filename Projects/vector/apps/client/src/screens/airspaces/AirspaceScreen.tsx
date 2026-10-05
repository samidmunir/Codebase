import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { AirspacePack } from '@vector/sim-core';
import { useAirspaceStatus } from '../../airspaces/airspace-status';
import { airlines, findAirspace } from '../../airspaces/registry';
import { useAuth } from '../../auth/auth-store';
import { LiveScope } from '../../demo/LiveScope';
import { shortAirport } from '../../scope/data-block';
import { isPublicPath, usePublicPageMeta } from '../../site/page-meta';
import { AIRSPACE_PITCH } from './airspace-pitch';
import './airspaces.css';

/** Carriers listed per airport. */
const TOP_CARRIERS = 8;

/** One airspace: its airports and runways, flows, procedures, carriers and neighbors. */
export function AirspaceScreen() {
  const { id = '' } = useParams();
  const entry = findAirspace(id);
  const auth = useAuth();
  const { isOpen } = useAirspaceStatus();
  const [pack, setPack] = useState<{ id: string; pack: AirspacePack } | undefined>(undefined);
  const path = `/airspaces/${id}`;
  usePublicPageMeta(isPublicPath(path) ? path : '/airspaces');

  useEffect(() => {
    if (!entry?.load) return;
    let cancelled = false;
    entry
      .load()
      .then((loaded) => !cancelled && setPack({ id: entry.id, pack: loaded }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [entry]);

  if (!entry)
    return (
      <div className="site-empty">
        <h1>Not found</h1>
        <p>There’s no airspace at this address.</p>
        <div>
          <Link to="/airspaces" className="site-button">
            All airspaces
          </Link>
        </div>
      </div>
    );

  const data = pack?.id === entry.id ? pack.pack : undefined;
  const play = auth.status === 'signedIn' ? `/setup/${entry.id}` : '/register';
  return (
    <div className="airspace-page">
      <section className="airspace-hero">
        <LiveScope airspaceId={entry.id} label={`A live Vector session in ${entry.name}`} />
        <div className="airspace-hero__shade" aria-hidden="true" />
        <div className="airspace-hero__text">
          <p className="airspace-hero__facility">{entry.facility} TRACON</p>
          <h1>{entry.name}</h1>
          <p>{AIRSPACE_PITCH[entry.id]}</p>
          {isOpen(entry.id) ? (
            <Link to={play} className="site-button site-button--primary site-button--large">
              {auth.status === 'signedIn' ? `Work ${entry.name}` : 'Create a free account to play'}
            </Link>
          ) : (
            <p className="airspace-tile__closed">Closed for now</p>
          )}
        </div>
      </section>

      <div className="site-page airspace-details">
        {!data ? (
          <p className="airspace-muted">Loading the airspace…</p>
        ) : (
          <AirspaceFacts pack={data} />
        )}
      </div>
    </div>
  );
}

function AirspaceFacts({ pack }: { pack: AirspacePack }) {
  const { airspace } = pack;
  const ilsRunways = pack.airports.reduce((n, a) => n + a.runways.filter((r) => r.ils).length, 0);
  const numbers = [
    { label: 'Airports you work', value: airspace.airports.length },
    { label: 'STARs', value: pack.arrivals.length },
    { label: 'Coded SIDs', value: pack.departures.length },
    { label: 'ILS runways', value: ilsRunways },
    { label: 'Published holds', value: pack.holds.length },
    { label: 'Fixes and navaids', value: pack.fixes.length },
  ];
  const airlineName = (icao: string) => airlines.find((a) => a.icao === icao)?.name ?? icao;

  return (
    <>
      <dl className="airspace-numbers">
        {numbers.map((number) => (
          <div key={number.label}>
            <dt>{number.label}</dt>
            <dd>{number.value.toLocaleString('en-US')}</dd>
          </div>
        ))}
      </dl>

      {pack.airports.map((airport) => {
        const traffic = pack.traffic.airports[airport.icao];
        const carriers = [...(traffic?.airlines ?? [])]
          .sort((a, b) => b.weight - a.weight)
          .slice(0, TOP_CARRIERS);
        return (
          <section
            key={airport.icao}
            className="airspace-card"
            aria-labelledby={`${airport.icao}-title`}
          >
            <header className="airspace-card__header">
              <h2 id={`${airport.icao}-title`}>
                <span className="airspace-code">{shortAirport(airport.icao)}</span> {airport.name}
              </h2>
              <p className="airspace-muted">
                {airport.towerCallsign} · elevation {airport.elevationFt.toLocaleString('en-US')} ft
              </p>
            </header>

            <div className="airspace-card__grid">
              <div>
                <h3>Runways</h3>
                <div className="airspace-table-wrap">
                  <table className="airspace-table">
                    <thead>
                      <tr>
                        <th>Runway</th>
                        <th className="num">Length</th>
                        <th>ILS</th>
                        <th className="num">Tower</th>
                      </tr>
                    </thead>
                    <tbody>
                      {airport.runways.map((runway) => (
                        <tr key={runway.id}>
                          <td className="airspace-code">{runway.id}</td>
                          <td className="num">{runway.lengthFt.toLocaleString('en-US')} ft</td>
                          <td>
                            {runway.ils ? (
                              <span className="airspace-code">
                                {runway.ils.ident} {runway.ils.frequencyMhz.toFixed(2)}
                              </span>
                            ) : (
                              <span className="airspace-muted">–</span>
                            )}
                          </td>
                          <td className="num">{runway.towerFrequencyMhz.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3>Flows, most preferred first</h3>
                <ul className="airspace-flows">
                  {(traffic?.runwayConfigs ?? []).map((config) => (
                    <li key={config.id}>
                      <span>
                        <span className="airspace-muted">ARR</span> {config.arrivals.join(' ')}
                      </span>
                      <span>
                        <span className="airspace-muted">DEP</span> {config.departures.join(' ')}
                      </span>
                    </li>
                  ))}
                </ul>
                <h3>Arrivals</h3>
                <p className="airspace-procedures">
                  {pack.arrivals
                    .filter((star) => star.airport === airport.icao)
                    .map((star) => star.id)
                    .join(' · ') || '–'}
                </p>
                <h3>Main carriers</h3>
                <p>{carriers.map((carrier) => airlineName(carrier.icao)).join(', ') || '–'}</p>
              </div>
            </div>
          </section>
        );
      })}

      <section className="airspace-card">
        <h2>Around you</h2>
        <p>
          <strong>{airspace.controllers.center.callsign}</strong> owns the airspace around the
          TRACON
          {airspace.controllers.adjacentCenters.length > 0 &&
            `, with ${airspace.controllers.adjacentCenters.map((c) => c.callsign).join(', ')} beyond`}
          . You’re {airspace.controllers.approach.approachCallsign} and{' '}
          {airspace.controllers.approach.departureCallsign}, with{' '}
          {airspace.radars.map((radar) => radar.name).join(', ')} feeding your scope.
        </p>
        <p className="airspace-muted">
          Built from {airspace.sources.map((source) => source.name).join(', ')}.
        </p>
      </section>
    </>
  );
}
