import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ENV } from "../config/env.js";

const catalogProxyRouter = express.Router();

const TARGET = ENV.UPSTREAM.CATALOG;

catalogProxyRouter.use(
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

export default catalogProxyRouter;
