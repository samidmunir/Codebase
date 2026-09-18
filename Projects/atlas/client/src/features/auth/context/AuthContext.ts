import { createContext } from "react";

import type { LoginRequest, RegisterRequest, User } from "../types/auth.types";

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;

  isAuthenticated: boolean;
  isLoading: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
