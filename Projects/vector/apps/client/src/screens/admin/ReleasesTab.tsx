import { useEffect, useState } from 'react';
import {
  FEATURE_STATUSES,
  RELEASE_STATUSES,
  type FeatureStatus,
  type Release,
  type ReleaseFeature,
  type ReleaseStatus,
} from '@vector/shared';
import { createRelease, deleteRelease, getReleases, updateRelease } from '../../api/releases-api';
import { ReleaseStatusChip } from '../../components/roadmap/ReleaseParts';
import { releaseTitle } from '../../components/roadmap/release-format';
import { errorMessage, formatAgo } from './admin-format';

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  released: 'Released',
  next: 'Next',
  planned: 'Planned',
};
const FEATURE_LABEL: Record<FeatureStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
};

interface Draft {
  version: string;
  name: string;
  summary: string;
  status: ReleaseStatus;
  releasedOn: string;
  features: ReleaseFeature[];
}

const EMPTY: Draft = {
  version: '',
  name: '',
  summary: '',
  status: 'planned',
  releasedOn: '',
  features: [],
};
const draftOf = (release: Release): Draft => ({
  version: release.version,
  name: release.name,
  summary: release.summary,
  status: release.status,
  releasedOn: release.releasedOn ?? '',
  features: release.features,
});

/** The roadmap: each version, its features and their status (the landing page shows the next one). */
export function ReleasesTab() {
  const [releases, setReleases] = useState<Release[]>();
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<{ id: string | undefined; draft: Draft }>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    getReleases()
      .then((list) => current && setReleases(list))
      .catch((caught: unknown) => current && setError(errorMessage(caught)));
    return () => {
      current = false;
    };
  }, [reload]);

  if (editing)
    return (
      <ReleaseEditor
        id={editing.id}
        initial={editing.draft}
        onDone={() => {
          setEditing(undefined);
          setReload((n) => n + 1);
        }}
      />
    );

  return (
    <div className="admin-users__list">
      <div className="admin-toolbar">
        <p className="admin-muted admin-toolbar__search">
          The landing page shows the <strong>Next</strong> version’s features; the footer shows the
          newest <strong>Released</strong> one; /roadmap shows them all.
        </p>
        <button
          type="button"
          className="admin-button admin-button--primary"
          onClick={() => setEditing({ id: undefined, draft: EMPTY })}
        >
          New version
        </button>
      </div>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {!releases ? (
        <p className="admin-muted">Loading…</p>
      ) : releases.length === 0 ? (
        <p className="admin-muted">No versions yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Features</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.id}>
                  <td>
                    <div className="admin-user-link__name">{releaseTitle(release)}</div>
                    {release.summary && <div className="admin-muted">{release.summary}</div>}
                  </td>
                  <td>
                    <ReleaseStatusChip release={release} />
                  </td>
                  <td className="nowrap">
                    {release.features.filter((f) => f.status === 'shipped').length} of{' '}
                    {release.features.length} shipped
                  </td>
                  <td className="nowrap">{formatAgo(release.updatedAt)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() => setEditing({ id: release.id, draft: draftOf(release) })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-link admin-link--danger"
                        onClick={() => {
                          if (!window.confirm(`Delete v${release.version}? This can’t be undone.`))
                            return;
                          deleteRelease(release.id)
                            .then(() => setReload((n) => n + 1))
                            .catch((caught: unknown) => setError(errorMessage(caught)));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReleaseEditor({
  id,
  initial,
  onDone,
}: {
  id: string | undefined;
  initial: Draft;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setFeature = (index: number, patch: Partial<ReleaseFeature>) =>
    set({
      features: draft.features.map((feature, i) =>
        i === index ? { ...feature, ...patch } : feature,
      ),
    });
  const move = (index: number, by: number) => {
    const features = [...draft.features];
    const [moved] = features.splice(index, 1);
    features.splice(index + by, 0, moved!);
    set({ features });
  };

  const save = async () => {
    setBusy(true);
    setError(undefined);
    const request = {
      ...draft,
      releasedOn: draft.status === 'released' && draft.releasedOn ? draft.releasedOn : null,
    };
    try {
      if (id) await updateRelease(id, request);
      else await createRelease(request);
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <div className="admin-card admin-form" aria-label={id ? 'Edit version' : 'New version'}>
      <h2>{id ? `Edit v${initial.version}` : 'New version'}</h2>
      <div className="admin-form__grid">
        <label>
          Version (e.g. 0.2)
          <input
            className="admin-input admin-code"
            value={draft.version}
            onChange={(event) => set({ version: event.target.value })}
          />
        </label>
        <label>
          Name (optional)
          <input
            className="admin-input"
            maxLength={60}
            placeholder="The beta"
            value={draft.name}
            onChange={(event) => set({ name: event.target.value })}
          />
        </label>
        <label>
          Release date
          <input
            className="admin-input"
            type="date"
            disabled={draft.status !== 'released'}
            value={draft.releasedOn}
            onChange={(event) => set({ releasedOn: event.target.value })}
          />
        </label>
      </div>
      <div className="admin-segmented" role="radiogroup" aria-label="Status">
        {RELEASE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={draft.status === status}
            onClick={() => set({ status })}
          >
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>
      <label>
        Summary (one line, on the landing page)
        <textarea
          className="admin-input"
          rows={2}
          maxLength={400}
          value={draft.summary}
          onChange={(event) => set({ summary: event.target.value })}
        />
      </label>

      <h3 className="admin-release__features-title">Features</h3>
      <ol className="admin-release__features">
        {draft.features.map((feature, index) => (
          <li key={index} className="admin-release__feature">
            <div className="admin-form__grid">
              <label>
                Title
                <input
                  className="admin-input"
                  maxLength={80}
                  value={feature.title}
                  onChange={(event) => setFeature(index, { title: event.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  className="admin-input"
                  value={feature.status}
                  onChange={(event) =>
                    setFeature(index, { status: event.target.value as FeatureStatus })
                  }
                >
                  {FEATURE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {FEATURE_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                className="admin-input"
                rows={2}
                maxLength={300}
                value={feature.description}
                onChange={(event) => setFeature(index, { description: event.target.value })}
              />
            </label>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-link"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="admin-link"
                disabled={index === draft.features.length - 1}
                onClick={() => move(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="admin-link admin-link--danger"
                onClick={() => set({ features: draft.features.filter((_, i) => i !== index) })}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="admin-button"
        disabled={draft.features.length >= 20}
        onClick={() =>
          set({ features: [...draft.features, { title: '', description: '', status: 'planned' }] })
        }
      >
        Add a feature
      </button>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-form__actions">
        <button type="button" className="admin-button" onClick={onDone}>
          Cancel
        </button>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={busy || !draft.version.trim()}
          onClick={() => void save()}
        >
          {id ? 'Save' : 'Add version'}
        </button>
      </div>
    </div>
  );
}
