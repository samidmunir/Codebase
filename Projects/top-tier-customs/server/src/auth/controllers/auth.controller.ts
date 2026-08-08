import type { Request, Response } from "express";
import type { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

const JWT_ACCESS_TTL: SignOptions["expiresIn"] =
  (process.env.JWT_ACCESS_TTL as SignOptions["expiresIn"]) || "15m";

// Request Body Types
interface RegisterBody {
  firstName: string;
  lastName: string;
  location: {
    city: string;
    country: string;
  };
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface ResetPasswordBody {
  password: string;
  newPassword: string;
}

interface SavedProductBody {
  productId: string;
}

interface SavedVehicleBody {
  vehicle: string;
}

// Helper
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred.";
};
