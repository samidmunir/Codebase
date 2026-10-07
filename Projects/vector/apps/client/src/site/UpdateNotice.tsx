import { useLocation } from 'react-router';
import { useAppOutdated } from './app-version';
import './update-notice.css';

/** "Vector has been updated": shown once this tab is running an older build. */
export function UpdateNotice() {
  const outdated = useAppOutdated();
  const { pathname } = useLocation();
  if (!outdated) return null;
  const inSession = pathname.startsWith('/scope/');

  return (
    <div className="update-notice" role="status">
      <span className="update-notice__dot" aria-hidden="true" />
      <span>
        <strong>Vector has been updated.</strong>{' '}
        {inSession
          ? 'Save your session, then reload to get the latest.'
          : 'Reload to get the latest.'}
      </span>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
