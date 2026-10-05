import { useSearchParams } from 'react-router';
import { CategoriesPanel } from './CategoriesPanel';
import { PostsPanel, ThreadsPanel } from './CommunityContent';
import { ReportsPanel } from './ReportsPanel';

const SECTIONS = [
  { id: 'reports', label: 'Reports' },
  { id: 'threads', label: 'Threads' },
  { id: 'posts', label: 'Posts' },
  { id: 'categories', label: 'Categories', adminOnly: true },
] as const;
type Section = (typeof SECTIONS)[number]['id'];

/** The community: reports first, then every thread and post, and (for admins) categories. */
export function CommunityTab({ isAdmin }: { isAdmin: boolean }) {
  const [params, setParams] = useSearchParams();
  const sections = SECTIONS.filter((section) => isAdmin || !('adminOnly' in section));
  const current: Section = sections.some((s) => s.id === params.get('section'))
    ? (params.get('section') as Section)
    : 'reports';
  const open = (id: Section) => {
    const next = new URLSearchParams(params);
    if (id === 'reports') next.delete('section');
    else next.set('section', id);
    setParams(next);
  };

  return (
    <div className="admin-community">
      <nav className="admin-segmented admin-community__sections" aria-label="Community">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-current={current === section.id ? 'page' : undefined}
            onClick={() => open(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
      {current === 'reports' && <ReportsPanel />}
      {current === 'threads' && <ThreadsPanel />}
      {current === 'posts' && <PostsPanel />}
      {current === 'categories' && isAdmin && <CategoriesPanel />}
    </div>
  );
}
