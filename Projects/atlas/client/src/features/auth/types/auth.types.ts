export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  isVerified: boolean;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  timezone: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface LogoutResponse {
  message: string;
}

export interface ApiError {
  error: string;
}
