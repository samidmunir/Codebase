import { SettingsView } from '../settings/SettingsView';

/** Settings over the scope, so the session keeps its state while the player adjusts them. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="scope-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="scope-dialog scope-dialog--settings"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="scope-dialog__header">
          <h2>Settings</h2>
          <button
            type="button"
            className="scope-panel__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </header>
        <SettingsView />
      </div>
    </div>
  );
}
