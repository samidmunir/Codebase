import { Link } from 'react-router';
import { useAirspaceStatus } from '../../airspaces/airspace-status';
import { AIRSPACES } from '../../airspaces/registry';
import { shortAirport } from '../../scope/data-block';
import { usePublicPageMeta } from '../../site/page-meta';
import { AIRSPACE_PITCH } from './airspace-pitch';
import './airspaces.css';

/** Every airspace, linking to what it's like. */
export function AirspacesScreen() {
  usePublicPageMeta('/airspaces');
  const { isOpen } = useAirspaceStatus();
  return (
    <div className="site-page airspaces-page">
      <h1>Airspaces</h1>
      <p className="site-page__lede">
        Each is a real TRACON and the Center airspace around it, 150 NM out and up to FL450, built
        from the FAA’s published procedures, frequencies and minimum vectoring altitudes.
      </p>
      <div className="airspace-tiles">
        {AIRSPACES.map((airspace) => (
          <Link key={airspace.id} to={`/airspaces/${airspace.id}`} className="airspace-tile">
            <span className="airspace-tile__facility">{airspace.facility}</span>
            <h2>{airspace.name}</h2>
            <p className="airspace-tile__airports">
              {airspace.airports.map(shortAirport).join(' · ')}
            </p>
            <p>{AIRSPACE_PITCH[airspace.id]}</p>
            {!isOpen(airspace.id) && <span className="airspace-tile__closed">Closed for now</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
