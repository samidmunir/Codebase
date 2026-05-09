import jwt from "jsonwebtoken";
import ENV from "../config/env.js";

export const verifyRequestViaGateway = (req, res, next) => {
  const gatewaySecretFromReqHeaders = req.headers["x-gateway-secret"];
  console.log(gatewaySecretFromReqHeaders);

  if (!gatewaySecretFromReqHeaders) {
    return res.status(401).json({
      ok: false,
      source: "<api.gateway.middleware>: verifyRequestViaGateway()",
      message: "Missing gateway shared secret.",
    });
  }

  if (gatewaySecretFromReqHeaders !== process.env.GATEWAY_SHARED_SECRET) {
    return res.status(403).json({
      ok: false,
      source: "<api.gateway.middleware>: verifyRequestViaGateway()",
      message: "Invalid gateway shared secret.",
    });
  }

  next();
};

export const authorize = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(401).json({
      source: "<api.auth.middleware>: authorize()",
      message: "Missing Authorization header.",
      success: false,
    });
  }

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return res.status(400).json({
      source: "<api.auth.middleware>: authorize()",
      message: "Invalid Authorization header format.",
      success: false,
    });
  }

  try {
    const payload = jwt.verify(token, ENV.JWT.ACCESS);

    req.user = payload;

    next();
  } catch (e) {
    return res.status(401).json({
      source: "<api.auth.middleware>: authorize()",
      message: "Invalid or expired Access Token.",
      success: false,
    });
  }
};
