import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateAT, generateRT } from "../utils/tokens.js";
import ENV from "../config/env.js";

const set_refresh_token_cookie = (res, token) => {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
};

export const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const db_user = await User.findOne({ email });
    if (db_user) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email,
      password_hash: password_hash,
      profile: {
        first_name: first_name,
        last_name: last_name,
      },
    });

    return res.status(201).json({ user: user });
  } catch (e) {
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const db_user = await User.findOne({ email });
    if (!db_user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const is_password_valid = await bcrypt.compare(
      password,
      db_user.password_hash
    );
    if (!is_password_valid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const access_token = generateAT(db_user);
    const refresh_token = generateRT(db_user);

    set_refresh_token_cookie(res, refresh_token);

    return res.status(200).json({ user: db_user, access_token: access_token });
  } catch (e) {
    next(e);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refresh_token;
    if (!token) {
      return res.status(401).json({ message: "Missing refresh token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, ENV.JWT.RT);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const db_user = await User.findById(payload.sub);
    if (!db_user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    const new_access_token = generateAT(db_user);
    const new_refresh_token = generateRT(db_user);

    set_refresh_token_cookie(res, new_refresh_token);

    return res
      .status(200)
      .json({ user: db_user, access_token: new_access_token });
  } catch (e) {
    next(e);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.json({ message: "Logged out successfully" });
  } catch (e) {
    next(e);
  }
};

export const me = async (req, res, next) => {
  try {
    const user_ID = req.user.sub;
    const db_user = await User.findById(user_ID);
    if (!db_user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: db_user });
  } catch (e) {
    next(e);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const user_ID = req.user.sub;
    const db_user = await User.findById(user_ID);
    if (!db_user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, new_password } = req.body;
    const is_password_valid = await bcrypt.compare(
      password,
      db_user.password_hash
    );
    if (!is_password_valid) {
      return res
        .status(401)
        .json({ message: "Invalid password. Unable to update password." });
    }

    if (password === new_password) {
      return res
        .status(400)
        .json({ message: "New password must be different than old." });
    }

    const new_password_hash = await bcrypt.hash(new_password, 10);
    // await db_user.updateOne({ password_hash: new_password_hash });
    db_user.password_hash = new_password_hash;

    const now = new Date().toISOString();
    db_user.password_last_reset = now;

    await db_user.save();

    return res.status(204).json({ message: "Your password has been updated." });
  } catch (e) {
    next(e);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const user_ID = req.user.sub;
    const db_user = await User.findById(user_ID);
    if (!db_user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { settings } = req.body;
    db_user.settings = settings;

    await db_user.save();

    return res
      .status(204)
      .json({ message: "Notification settings updated successfully." });
  } catch (e) {
    next(e);
  }
};
