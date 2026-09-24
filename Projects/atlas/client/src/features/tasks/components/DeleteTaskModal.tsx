import { useEffect } from "react";

interface DeleteTaskModalProps {
  taskTitle: string;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteTaskModal({
  taskTitle,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteTaskModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleting, onClose]);

  return (
    <div
      className="task-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <section
        className="task-delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
        aria-describedby="delete-task-description"
      >
        <header className="task-delete-modal__header">
          <div>
            <p className="tasks-eyebrow">Destructive Action</p>

            <h2 id="delete-task-title">Delete task?</h2>
          </div>

          <button
            type="button"
            className="task-modal__close"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close delete task dialog"
          >
            ×
          </button>
        </header>

        <div className="task-delete-modal__body">
          <p id="delete-task-description">
            You're about to permanently delete this task:
          </p>

          <div className="task-delete-modal__task">{taskTitle}</div>

          <p className="task-delete-modal__warning">
            This action cannot be undone.
          </p>

          {error && (
            <div className="task-form__error" role="alert">
              {error}
            </div>
          )}
        </div>

        <footer className="task-delete-modal__actions">
          <button
            type="button"
            className="tasks-secondary-button"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="task-delete-button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Task"}
          </button>
        </footer>
      </section>
    </div>
  );
}
