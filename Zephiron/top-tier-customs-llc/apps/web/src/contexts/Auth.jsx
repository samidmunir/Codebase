import { createContext, useContext, useEffect, useState } from "react";
import api, { set_access_token } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [status, setStatus] = useState("loading");

  const apply_access_token = (token) => {
    setAccessToken(token);
    set_access_token(token);
  };

  useEffect(() => {
    const init_auth = async () => {
      try {
        const res = await api.post("/api/auth/refresh", {});
        setUser(res.data.user);
        apply_access_token(res.data.access_token);
        setStatus("authenticated");
      } catch (e) {
        setUser(null);
        apply_access_token(null);
        setStatus("unauthenticated");
      }
    };

    init_auth();
  }, []);

  const value = {
    user,
    accessToken,
    status,
    isAuthenticated: status === "authenticated" && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
