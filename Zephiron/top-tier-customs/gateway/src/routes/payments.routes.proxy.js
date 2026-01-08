import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate } from "../middleware/auth.middleware.js";
import ENV from "../config/env.js";

const paymentsRouter = express.Router();

const TARGET = ENV.UPSTREAM.PAYMENTS;
const SECRET = ENV.SECRET;

const paymentsProxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-gateway-secret", SECRET);
      if (req.user) {
        proxyReq.setHeader("x-user-id", req.user.sub);
        proxyReq.setHeader("x-user-email", req.user.email);
        proxyReq.setHeader("x-user-role", req.user.role);
      }
    },
  },
});

paymentsRouter.post("/checkout-session", authenticate, paymentsProxy);
paymentsRouter.post("/stripe/webhook", paymentsProxy);

paymentsRouter.get("/health", paymentsProxy);

export default paymentsRouter;
