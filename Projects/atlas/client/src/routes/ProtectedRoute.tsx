import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../features/auth";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  const location = useLocation();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__logo">A</div>

        <p>Loading your Atlas...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return <Outlet />;
}
