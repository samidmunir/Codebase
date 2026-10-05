import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../auth/auth-store';
import { useGameControls } from '../../controls/use-game-controls';
import { ActivityTab } from './ActivityTab';
import { AirspacesTab } from './AirspacesTab';
import { CommunityTab } from './CommunityTab';
import { NewsTab } from './NewsTab';
import { DashboardTab } from './DashboardTab';
import { OverviewTab } from './OverviewTab';
import { ResultsTab } from './ResultsTab';
import { SessionsTab } from './SessionsTab';
import { SiteTab } from './SiteTab';
import { UsersTab } from './UsersTab';
import { usePageMeta } from '../../site/page-meta';
import './admin-screen.css';

const TABS = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'airspaces', label: 'Airspaces' },
  { id: 'site', label: 'Site' },
  { id: 'results', label: 'Results' },
  { id: 'sessions', label: 'Saved sessions' },
  { id: 'news', label: 'News' },
  { id: 'community', label: 'Community' },
  { id: 'activity', label: 'Activity' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** The tabs a moderator sees: the community, nothing else. */
const MODERATOR_TABS: readonly TabId[] = ['community'];

/**
 * Administration: everything for admins; the community for moderators. Only staff
 * get here (and the server checks every request too).
 */
export function AdminScreen() {
  usePageMeta({ title: 'Admin' });
  const auth = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  useGameControls({ closeMenu: () => void navigate('/play') });

  if (auth.status !== 'signedIn') return null;
  if (auth.user.role === 'player') return <Navigate to="/play" replace />;
  // Old links to a user opened them in a panel; they have their own page now.
  const linkedUser = params.get('user');
  if (linkedUser) return <Navigate to={`/admin/users/${linkedUser}`} replace />;

  const isAdmin = auth.user.role === 'admin';
  const tabs = TABS.filter((t) => isAdmin || MODERATOR_TABS.includes(t.id));
  const tab: TabId = tabs.some((t) => t.id === params.get('tab'))
    ? (params.get('tab') as TabId)
    : (tabs[0]?.id ?? 'community');
  const open = (next: TabId, extra: Record<string, string> = {}) =>
    setParams({ ...(next === tabs[0]?.id ? {} : { tab: next }), ...extra });

  return (
    <div className="admin-screen">
      <header className="admin-screen__bar">
        <h1>{isAdmin ? 'Administration' : 'Moderation'}</h1>
        <span className="admin-screen__who">
          Signed in as <strong>{auth.user.email}</strong>
        </span>
      </header>

      <nav className="admin-tabs" aria-label="Administration">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className="admin-tabs__tab"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => open(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="admin-screen__panel">
        {tab === 'overview' && (
          <>
            <DashboardTab onOpen={open} />
            <OverviewTab onOpen={open} />
          </>
        )}
        {tab === 'users' && <UsersTab currentUserId={auth.user.id} />}
        {tab === 'airspaces' && <AirspacesTab />}
        {tab === 'site' && <SiteTab />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'news' && <NewsTab />}
        {tab === 'community' && <CommunityTab isAdmin={isAdmin} />}
        {tab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}
