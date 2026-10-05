import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../auth/auth-store';
import { useGameControls } from '../../controls/use-game-controls';
import { ActivityTab } from './ActivityTab';
import { AirspacesTab } from './AirspacesTab';
import { NewsTab } from './NewsTab';
import { OverviewTab } from './OverviewTab';
import { ResultsTab } from './ResultsTab';
import { UsersTab } from './UsersTab';
import { usePageMeta } from '../../site/page-meta';
import './admin-screen.css';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'airspaces', label: 'Airspaces' },
  { id: 'results', label: 'Results' },
  { id: 'news', label: 'News' },
  { id: 'activity', label: 'Activity' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** Administration: users, airspaces and the audit log. Only admins get here (the server checks too). */
export function AdminScreen() {
  usePageMeta({ title: 'Admin' });
  const auth = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  useGameControls({ closeMenu: () => void navigate('/play') });

  if (auth.status !== 'signedIn') return null;
  if (auth.user.role !== 'admin') return <Navigate to="/play" replace />;

  const tab: TabId = TABS.some((t) => t.id === params.get('tab'))
    ? (params.get('tab') as TabId)
    : 'overview';
  const open = (next: TabId, extra: Record<string, string> = {}) =>
    setParams({ ...(next === 'overview' ? {} : { tab: next }), ...extra });

  return (
    <div className="admin-screen">
      <header className="admin-screen__bar">
        <h1>Administration</h1>
        <span className="admin-screen__who">
          Signed in as <strong>{auth.user.email}</strong>
        </span>
      </header>

      <nav className="admin-tabs" aria-label="Administration">
        {TABS.map((t) => (
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
        {tab === 'overview' && <OverviewTab onOpen={open} />}
        {tab === 'users' && (
          <UsersTab
            selectedId={params.get('user') ?? undefined}
            onSelect={(id) => open('users', id ? { user: id } : {})}
            currentUserId={auth.user.id}
          />
        )}
        {tab === 'airspaces' && <AirspacesTab />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'news' && <NewsTab />}
        {tab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
}
