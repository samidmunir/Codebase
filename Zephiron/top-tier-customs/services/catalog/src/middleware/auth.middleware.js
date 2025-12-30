import ENV from "../config/env.js";

export const gatewayCheck = async (req, res, next) => {
  const secret = req.headers["x-gateway-secret"];
  // console.log("[gatewayCheck] -> SECRET:", secret);
  if (!secret || secret !== ENV.SECRET) {
    return res.status(401).json({
      source: "<api.catalog.middleware[auth]>: gatewayCheck()",
      message: "Unauthorized source.",
      success: false,
      secret: secret,
      env_secret: ENV.SECRET,
    });
  }

  next();
};

export const authorize = async (req, res, next) => {
  const role = req.headers["x-user-role"];
  // console.log("[authorize] -> ROLE:", role);
  if (role !== "admin") {
    return res.status(403).json({
      source: "<api.catalog.middleware[auth]>: authorize()",
      message: "Forbidden.",
      success: false,
    });
  }

  next();
};
