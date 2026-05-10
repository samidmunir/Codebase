import { Navigate, replace } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AuthProtected = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>LOADING...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthProtected;
