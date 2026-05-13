import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/Auth";

const CustomerProtected = () => {
  const { status, isAuthenticated } = useAuth();

  if (status === "loading") {
    return (
      <main className="min-h-screen text-7xl flex justify-center items-center">
        LOADING....
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default CustomerProtected;
