import jwt from "jsonwebtoken";
import ENV from "../config/env.js";

export const generateAT = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    token_version: user.token_version,
  };
  const AT = jwt.sign(payload, ENV.JWT.AT, { expiresIn: ENV.JWT.AT_TTL });

  return AT;
};

export const generateRT = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    token_version: user.token_version,
  };
  const RT = jwt.sign(payload, ENV.JWT.RT, { expiresIn: ENV.JWT.RT_TTL });

  return RT;
};
