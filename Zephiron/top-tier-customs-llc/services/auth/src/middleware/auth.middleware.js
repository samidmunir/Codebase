import jwt from "jsonwebtoken";
import ENV from "../config/env.js";

const requireAuth = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid Authorization format" });
  }

  try {
    const payload = jwt.verify(token, ENV.JWT.AT);

    req.user = payload;

    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export default requireAuth;
