import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate } from "../middleware/auth.middleware.js";
import ENV from "../config/env.js";

const ordersRouter = express.Router();

const TARGET = ENV.UPSTREAM.ORDERS;
const SECRET = ENV.SECRET;

const ordersProxy = createProxyMiddleware({
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

ordersRouter.post("/:id", authenticate, ordersProxy);
ordersRouter.get("/:id", authenticate, ordersProxy);
ordersRouter.post("/:id", authenticate, ordersProxy);

ordersRouter.get("/health", ordersProxy);

export default ordersRouter;
