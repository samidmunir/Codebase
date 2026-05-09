import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import ENV from "../config/env.js";

const authProxy = express.Router();

const TARGET = ENV.UPSTREAM.AUTH;

authProxy.use(
  "/",
  createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader(
          "x-gateway-secret",
          process.env.GATEWAY_SHARED_SECRET,
        );
      },
    },
  }),
);

export default authProxy;
