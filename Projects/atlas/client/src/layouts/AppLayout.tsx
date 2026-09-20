import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../features/auth";

import "./AppLayout.css";

export function AppLayout() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <div className="app-sidebar__logo">A</div>

          <span>ATLAS</span>
        </div>

        <nav className="app-sidebar__nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Projects
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Tasks
          </NavLink>

          <NavLink
            to="/goals"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Goals
          </NavLink>

          <NavLink
            to="/habits"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Habits
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            Calendar
          </NavLink>
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user">
            <div className="app-sidebar__avatar">
              {user?.firstName?.[0]?.toUpperCase() ?? "A"}
            </div>

            <div>
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>

              <span>{user?.email}</span>
            </div>
          </div>

          <button
            type="button"
            className="app-sidebar__logout"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <span className="app-topbar__context">
              Personal Operating System
            </span>
          </div>

          <div className="app-topbar__actions">
            <span className="app-topbar__status">
              <span />
              Synced
            </span>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
