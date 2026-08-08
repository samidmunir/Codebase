import type { Request, Response } from "express";
import type { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import e from "cors";

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

export const health = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  return res.status(200).json({
    success: true,
    service: "auth",
    status: "healthy",
    message: "Auth API is running",
    timestamp: new Date().toISOString(),
  });
};

export const register = async (
  req: Request<Record<string, never>, unknown, RegisterBody>,
  res: Response,
): Promise<Response> => {
  try {
    const { firstName, lastName, location, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Registration failed.",
        error: "Email already in use.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      location,
      email,
      password: hashedPassword,
      role: "customer",
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        location: newUser.location,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Registration failed.",
      error: getErrorMessage(error),
    });
  }
};

export const login = async (
  req: Request<Record<string, never>, unknown, LoginBody>,
  res: Response,
): Promise<Response> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Login failed.",
        error: "User not found.",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Login failed.",
        error: "Invalid credentials.",
      });
    }

    if (!JWT_ACCESS_SECRET) {
      throw new Error("JWT_ACCESS_SECRET is not defined.");
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      JWT_ACCESS_SECRET,
      { expiresIn: JWT_ACCESS_TTL },
    );

    const userData = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      dob: user.dob,
      location: user.location,
      phone: user.phone,
      email: user.email,
      role: user.role,
      billingAddress: user.billingAddress,
      shippingAddress: user.shippingAddress,
      vehicles: user.vehicles,
      savedProducts: user.savedProducts,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      token,
      user: userData,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: "Login failed.",
      error: getErrorMessage(error),
    });
  }
};
