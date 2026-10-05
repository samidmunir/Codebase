import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FEEDBACK_KINDS } from '@vector/shared';
import { ApiRequestError } from '../api/api-client';
import { sendFeedback } from '../api/beta-api';

const KIND_LABEL: Record<(typeof FEEDBACK_KINDS)[number], string> = {
  bug: 'Something’s wrong',
  idea: 'An idea',
  other: 'Something else',
};

/** Feedback for the team: what kind, what happened, and (filled in) where. */
export function FeedbackDialog({ page, onClose }: { page: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<(typeof FEEDBACK_KINDS)[number]>('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await sendFeedback({ kind, message, page });
      setSent(true);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? (caught.fields.message ?? caught.message)
          : 'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="feedback-dialog"
      aria-labelledby="feedback-title"
      onClose={onClose}
      // A click on the backdrop (the dialog itself, outside its content) closes it.
      onClick={(event) => event.target === dialog.current && dialog.current.close()}
    >
      {sent ? (
        <div className="feedback-dialog__body" role="status">
          <h2 id="feedback-title">Thanks: it’s with the team</h2>
          <p className="feedback-dialog__lede">
            Every message is read. If we need more, we’ll email you.
          </p>
          <div className="feedback-dialog__actions">
            <button
              type="button"
              className="site-button site-button--primary"
              onClick={() => dialog.current?.close()}
              autoFocus
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form className="feedback-dialog__body" onSubmit={(event) => void submit(event)}>
          <h2 id="feedback-title">Send feedback</h2>
          <p className="feedback-dialog__lede">
            A bug, an idea, anything: it goes straight to the people building Vector.
          </p>
          <div className="feedback-dialog__kinds" role="radiogroup" aria-label="Kind">
            {FEEDBACK_KINDS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={kind === option}
                onClick={() => setKind(option)}
              >
                {KIND_LABEL[option]}
              </button>
            ))}
          </div>
          <label className="feedback-dialog__field">
            <span>{kind === 'bug' ? 'What happened, and what did you expect?' : 'Tell us'}</span>
            <textarea
              name="feedback"
              rows={6}
              maxLength={4000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(error)}
              required
              autoFocus
            />
          </label>
          <p className="feedback-dialog__meta">
            Sent with: this page ({page || '/'}) and your browser, so we can follow it up.
          </p>
          {error && (
            <p className="feedback-dialog__error" role="alert">
              {error}
            </p>
          )}
          <div className="feedback-dialog__actions">
            <button type="button" className="site-button" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button
              type="submit"
              className="site-button site-button--primary"
              disabled={busy || message.trim().length < 3}
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
