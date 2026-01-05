import ENV from "../config/env.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import {
  clearRTCookie,
  generateAT,
  generateRT,
  setRTCookie,
} from "../utils/tokens.js";

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

    if (dbUser.sec_ops.failed_logins >= 3) {
      return res.status(403).json({
        ok: false,
        source: "<api.auth.controller>: signup()",
        message: "Failed to login.",
        error:
          "Account is locked, contact support [support@toptiercustoms.com]",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      dbUser.password_hash
    );
    if (!isPasswordValid) {
      if (dbUser.sec_ops.failed_logins) {
        dbUser.sec_ops.failed_logins++;
      } else {
        dbUser.sec_ops.failed_logins = 1;
      }
      await dbUser.save();

      return res.status(401).json({
        ok: false,
        source: "<api.auth.controller>: login()",
        message: "Failed to login.",
        error: "Invalid credentials.",
      });
    }

    dbUser.sec_ops.last_login = new Date().toISOString();
    await dbUser.save();

    const access_token = generateAT(dbUser);
    const refresh_token = generateRT(dbUser);

    setRTCookie(res, refresh_token);

    const userRes = {
      _id: dbUser._id,
      email: dbUser.email,
      role: dbUser.role,
      profile: dbUser.profile,
      sec_ops: dbUser.sec_ops,
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
