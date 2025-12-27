import ENV from "../config/env.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.auth.controller>: health()",
    message: `/api/auth is live on http://localhost:${ENV.PORT}`,
  });
};

export const signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, city, country } = req.body;

    if (!email || !password || !firstName || !lastName || !city || !country) {
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
      password_hash: hashedPassword,
      profile: {
        first_name: firstName,
        last_name: lastName,
        city: city,
        country: country,
      },
    });

    const userRes = {
      _id: user._id,
      email: user.email,
      roles: user.roles,
      firstName: user.profile.first_name,
      lastName: user.profile.last_name,
    };

    return res.status(201).json({
      ok: true,
      source: "<api.auth.controller>: signup()",
      message: "Signup successful.",
      user: userRes,
    });
  } catch (e) {
    //
  }
};
