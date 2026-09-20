import { useAuth } from "../../auth";
import "../styles/dashboard.css";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="dashboard__eyebrow">OVERVIEW</p>

          <h1>Welcome back, {user?.firstName}.</h1>

          <p>Here's a snapshot of your Atlas.</p>
        </div>

        <button type="button" className="dashboard__quick-add">
          + Quick add
        </button>
      </header>

      <section className="dashboard__metrics">
        <article className="dashboard-card">
          <span>Active Projects</span>
          <strong>0</strong>
          <small>No active projects yet</small>
        </article>

        <article className="dashboard-card">
          <span>Open Tasks</span>
          <strong>0</strong>
          <small>You're all caught up</small>
        </article>

        <article className="dashboard-card">
          <span>Active Goals</span>
          <strong>0</strong>
          <small>Define your first goal</small>
        </article>

        <article className="dashboard-card">
          <span>Habit Streaks</span>
          <strong>0</strong>
          <small>Start building momentum</small>
        </article>
      </section>

      <section className="dashboard__grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <span>Today</span>
              <h2>Your focus</h2>
            </div>
          </div>

          <div className="dashboard-empty">
            <div>◎</div>

            <strong>Nothing scheduled yet</strong>

            <p>Tasks and calendar events for today will appear here.</p>
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <span>Progress</span>
              <h2>Weekly momentum</h2>
            </div>
          </div>

          <div className="dashboard-empty">
            <div>↗</div>

            <strong>Your story starts here</strong>

            <p>
              Atlas will visualize your progress as you complete tasks and
              habits.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
