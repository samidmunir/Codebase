import ENV from "../config/env.js";

export const internalize = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== ENV.INTERNAL_SECRET) {
    return res.status(401).json({
      source: "api.orders.middleware[internal]: internalize()",
      message: "Unauthorized (internal)",
      success: false,
    });
  }

  next();
};
