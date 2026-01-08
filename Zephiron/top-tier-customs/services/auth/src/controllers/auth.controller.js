import ENV from "../config/env.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import {
  clearRTCookie,
  generateAT,
  generateRT,
  setRTCookie,
} from "../utils/tokens.js";
import mongoose from "mongoose";
import { stripe } from "../client/stripe.client.js";

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.auth.controller>: health()",
    message: `/api/auth is live on http://localhost:${ENV.PORT}`,
  });
};

export const signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, city, country, phone } =
      req.body;

    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !city ||
      !country ||
      !phone
    ) {
      return res.status(400).json({
        ok: false,
        source: "<api.auth.controller>: signup()",
        message: "Failed to signup.",
        error: "Missing required fields.",
      });
    }

    const dbUser = await User.findOne({ email });
    if (dbUser) {
      return res.status(400).json({
        ok: false,
        source: "<api.auth.controller>: signup()",
        message: "Failed to signup.",
        error: "Email already in use.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email,
      passwordHash: hashedPassword,
      profile: {
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        city: city,
        country: country,
      },
    });

    const userRes = {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    };

    return res.status(201).json({
      ok: true,
      source: "<api.auth.controller>: signup()",
      message: "Signup successful.",
      user: userRes,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.auth.controller>: signup()",
      message: "Failed to signup.",
      error: "Internal server error.",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        source: "<api.auth.controller>: login()",
        message: "Failed to login.",
        error: "Missing required fields.",
      });
    }

    const dbUser = await User.findOne({ email });
    if (!dbUser) {
      return res.status(401).json({
        ok: false,
        source: "<api.auth.controller>: login()",
        message: "Failed to login.",
        error: `An account does not exist with email: ${email}.`,
      });
    }

    if (dbUser.secOps.failedLogins > 3) {
      return res.status(403).json({
        ok: false,
        source: "<api.auth.controller>: signup()",
        message: "Failed to login.",
        error:
          "Account is locked, contact support [support@toptiercustoms.com]",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!isPasswordValid) {
      dbUser.secOps.failedLogins++;

      await dbUser.save();

      return res.status(401).json({
        ok: false,
        source: "<api.auth.controller>: login()",
        message: "Failed to login.",
        error: "Invalid credentials.",
      });
    }

    dbUser.secOps.lastLoginAt = new Date();
    await dbUser.save();

    const access_token = generateAT(dbUser);
    const refresh_token = generateRT(dbUser);

    setRTCookie(res, refresh_token);

    const userRes = {
      _id: dbUser._id,
      email: dbUser.email,
      role: dbUser.role,
      profile: dbUser.profile,
      secOps: dbUser.secOps,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    return res.status(200).json({
      ok: true,
      source: "<api.auth.controller>: login()",
      message: "Login successful.",
      user: userRes,
      access_token: access_token,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      ok: false,
      source: "<api.auth.controller>: login()",
      message: "Failed to login.",
      error: "Internal server error.",
    });
  }
};

export const logout = async (req, res) => {
  try {
    clearRTCookie(res);

    return res.status(200).json({
      ok: true,
      source: "<api.auth.controller>: logout()",
      message: "Logout successful.",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.auth.controller>: logout()",
      message: "Failed to logout.",
      error: "Internal server error.",
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const userID = req.params.id;

    const dbUser = await User.findById(userID);
    if (!dbUser) {
      return res
        .status(404)
        .json({ ok: false, message: `No user found with userID: ${userID}` });
    }

    return res.status(200).json({ ok: true, user: dbUser });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: "Internal server error." });
  }
};

export const setCustomerStripeID = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found",
      });
    }

    // ✅ If already exists, return it (idempotent)
    if (user.stripe?.customerId) {
      return res.status(200).json({
        ok: true,
        customerId: user.stripe.customerId,
      });
    }

    // ✅ Create Stripe Customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.profile?.firstName ?? ""} ${
        user.profile?.lastName ?? ""
      }`.trim(),
      metadata: {
        userId: String(user._id),
        role: user.role,
      },
    });

    user.stripe = user.stripe || {};
    user.stripe.customerId = customer.id;

    await user.save();

    return res.status(201).json({
      ok: true,
      customerId: customer.id,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Failed to get or create Stripe customer",
      error: err.message,
    });
  }
};
