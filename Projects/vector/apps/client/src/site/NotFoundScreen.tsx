import { Link } from 'react-router';
import { usePageMeta } from './page-meta';

/** Any address the app doesn't have. */
export function NotFoundScreen() {
  usePageMeta({ title: 'Not found' });
  return (
    <div className="site-empty">
      <h1>404</h1>
      <p>Radar contact lost: there’s no page at this address.</p>
      <div>
        <Link to="/" className="site-button site-button--primary">
          Back to Vector
        </Link>
      </div>
    </div>
  );
}
