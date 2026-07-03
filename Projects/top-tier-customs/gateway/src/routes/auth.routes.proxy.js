import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ENV } from "../config/env.js";

const authProxyRouter = express.Router();

const TARGET = ENV.UPSTREAM.AUTH;

authProxyRouter.use(
  "/",
  createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("x-gateway-secret", ENV.GATEWAY_SHARED_SECRET);
      },
    },
  }),
);

export default authProxyRouter;
