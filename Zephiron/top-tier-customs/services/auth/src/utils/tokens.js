import jwt from "jsonwebtoken";
import ENV from "../config/env.js";

export const generateAT = (user) => {
  const payload = {
    sub: user._id.toString(),
    roles: user.roles,
    token_version: user.token_version,
  };

  const AT = jwt.sign(payload, ENV.JWT.ACCESS, {
    expiresIn: ENV.JWT.ACCESS_TTL,
  });

  return AT;
};

export const generateRT = (user) => {
  const payload = {
    sub: user._id.toString(),
    roles: user.roles,
    token_version: user.token_version,
  };

  const RT = jwt.sign(payload, ENV.JWT.REFRESH, {
    expiresIn: ENV.JWT.REFRESH_TTL,
  });

  return RT;
};

export const setRTCookie = (res, token) => {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
  });
};
