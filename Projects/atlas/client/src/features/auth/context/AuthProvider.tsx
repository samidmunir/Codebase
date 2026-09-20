import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../api/authApi";

import type { LoginRequest, RegisterRequest, User } from "../types/auth.types";

import { AuthContext, type AuthContextValue } from "./AuthContext";

import {
  clearAccessToken,
  refreshAccessToken,
  setAccessToken as storeAccessToken,
} from "../services/tokenManager";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const isAuthenticated = user !== null && accessToken !== null;

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function initializeAuth() {
      try {
        const token = await refreshAccessToken();

        const meResponse = await getMe();

        if (cancelled) {
          return;
        }

        setAccessToken(token);
        setUser(meResponse.user);
      } catch {
        if (!cancelled) {
          clearAccessToken();

          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await loginRequest(credentials);

    storeAccessToken(response.accessToken);

    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    await registerRequest(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearAccessToken();

      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, accessToken, isAuthenticated, isLoading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
