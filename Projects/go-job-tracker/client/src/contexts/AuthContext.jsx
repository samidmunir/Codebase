import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearAccessToken, setAccessToken } from "../api/tokenStore";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applyAuthenticationResult = useCallback((response) => {
    const authData = response?.data;
    if (!authData?.accessToken || !authData?.user) {
      throw new Error("The authentication response was incomplete.");
    }

    setAccessToken(authData.accessToken);
    setUser(authData.user);

    return authData.user;
  }, []);

  const login = useCallback(
    async (credentials) => {
      const response = await loginUser(credentials);

      return applyAuthenticationResult(response);
    },
    [applyAuthenticationResult],
  );

  const register = useCallback(
    async (registrationData) => {
      const response = await registerUser(registrationData);

      return applyAuthenticationResult(response);
    },
    [applyAuthenticationResult],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const refreshResponse = await refreshSession();
      const authData = refreshResponse?.data;

      if (!authData?.accessToken) {
        throw new Error("Session refresh did not return an access token.");
      }

      setAccessToken(authData.accessToken);

      if (authData.user) {
        setUser(authData.user);
        return;
      }

      const meResponse = await getCurrentUser();
      setUser(meResponse?.data ?? null);
    } catch {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const reloadUser = useCallback(async () => {
    const response = await getCurrentUser();
    const currentUser = response?.data ?? null;

    setUser(currentUser);

    return currentUser;
  }, []);

  useEffect(() => {
    async function initializeAuthentication() {
      try {
        await restoreSession();
      } finally {
        setIsInitializing(false);
      }
    }

    initializeAuthentication();
  }, [restoreSession]);

  useEffect(() => {
    function handleSessionExpired() {
      clearAccessToken();
      setUser(null);
    }

    window.addEventListener("auth:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
      reloadUser,
    }),
    [user, isInitializing, login, register, logout, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth() must be used with an <AuthProvider> component.");
  }

  return context;
}
