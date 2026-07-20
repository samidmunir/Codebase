import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext.jsx";
import { getInitials } from "../../utils/getInitials.js";

export default function AppHeader() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      toast.success("You have been signed out.");
      navigate("/login", { replace: true });
    } catch {
      toast.error(
        "Your local session was cleared, but the server could not be reached.",
      );

      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="app-header">
      <button
        className="app-header__menu-button"
        type="button"
        aria-label="Open navigation"
      >
        <Menu size={21} />
      </button>

      <div className="app-search">
        <Search size={18} />

        <input
          type="search"
          placeholder="Search applications, companies, contacts..."
        />

        <kbd>⌘ K</kbd>
      </div>

      <div className="app-header__actions">
        <button
          className="icon-button"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="notification-indicator" />
        </button>

        <div className="profile-menu">
          <button
            className="profile-menu__trigger"
            type="button"
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            <span className="user-avatar">{getInitials(user)}</span>

            <span className="profile-menu__identity">
              <strong>{user?.displayName}</strong>
              <small>{user?.email}</small>
            </span>

            <ChevronDown size={17} />
          </button>

          {isProfileOpen && (
            <div className="profile-menu__dropdown">
              <div className="profile-menu__summary">
                <span className="user-avatar">{getInitials(user)}</span>

                <div>
                  <strong>{user?.displayName}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut size={17} />
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
