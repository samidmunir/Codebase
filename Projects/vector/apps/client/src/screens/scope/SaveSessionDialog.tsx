import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SESSION_NAME_MAX_LENGTH, airspaceIdSchema } from '@vector/shared';
import { ApiRequestError } from '../../api/api-client';
import {
  createSavedSession,
  renameSavedSession,
  replaceSavedSession,
} from '../../api/sessions-api';
import type { ScopeSession } from '../../sim/scope-session';
import { formatUtc } from './format';
import { formatRp } from './score-format';

interface SaveSessionDialogProps {
  session: ScopeSession;
  onClose: () => void;
  onSaved: (name: string) => void;
}

/** A name for a first save: facility and sim time, e.g. 'N90 · 14:32Z'. */
function suggestedSessionName(session: ScopeSession): string {
  return `${session.pack.airspace.facility} · ${formatUtc(session.engine.utcTime).slice(0, 5)}Z`;
}

/**
 * Saves the session to the player's account. The sim is paused while the
 * dialog is open. A session that was loaded or saved before can be
 * overwritten or saved as a new copy.
 */
export function SaveSessionDialog({ session, onClose, onSaved }: SaveSessionDialogProps) {
  const existing = session.saved;
  const [name, setName] = useState(existing?.name ?? suggestedSessionName(session));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const save = async (asNew: boolean) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const request = { difficulty: session.difficulty, snapshot: session.toSnapshot() };
      let saved;
      if (existing && !asNew) {
        saved = await replaceSavedSession(existing.id, request);
        if (trimmed !== existing.name) saved = await renameSavedSession(existing.id, trimmed);
      } else {
        saved = await createSavedSession({
          ...request,
          name: trimmed,
          airspaceId: airspaceIdSchema.parse(session.pack.airspace.id),
        });
      }
      session.markSaved(saved.id, saved.name);
      onSaved(saved.name);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Couldn't reach the server. Try again.",
      );
      setSaving(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save(false);
  };

  return (
    <div className="scope-dialog-backdrop" onMouseDown={onClose}>
      <form
        className="scope-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-session-title"
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="save-session-title">Save session</h2>
        <p className="scope-dialog__detail">
          {formatRp(session.engine.score.total)} · {session.engine.listAircraft().length} aircraft ·{' '}
          {formatUtc(session.engine.utcTime)}Z · the sim stays paused
        </p>
        <label className="scope-dialog__field">
          <span>Name</span>
          <input
            ref={inputRef}
            value={name}
            maxLength={SESSION_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error ? true : undefined}
            disabled={saving}
          />
        </label>
        {error && (
          <p className="scope-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="scope-dialog__actions">
          <button type="button" className="scope-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {existing && (
            <button
              type="button"
              className="scope-button"
              onClick={() => void save(true)}
              disabled={saving}
            >
              Save as new
            </button>
          )}
          <button type="submit" className="scope-button scope-button--primary" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save' : 'Save session'}
          </button>
        </div>
      </form>
    </div>
  );
}
