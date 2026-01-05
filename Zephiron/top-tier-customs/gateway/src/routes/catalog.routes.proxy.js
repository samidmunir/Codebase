import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import ENV from "../config/env.js";

const catalogRouter = express.Router();

const TARGET = ENV.UPSTREAM.CATALOG;
const SECRET = ENV.SECRET;

const catalogProxy = createProxyMiddleware({
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

catalogRouter.post(
  "/admin/products",
  authenticate,
  authorize("admin"),
  catalogProxy
);
catalogRouter.put(
  "/admin/products/:id",
  authenticate,
  authorize("admin"),
  catalogProxy
);
catalogRouter.delete(
  "/admin/products/:id",
  authenticate,
  authorize("admin"),
  catalogProxy
);

catalogRouter.post(
  "/admin/services",
  authenticate,
  authorize("admin"),
  catalogProxy
);
catalogRouter.put(
  "/admin/services/:id",
  authenticate,
  authorize("admin"),
  catalogProxy
);
catalogRouter.delete(
  "/admin/services/:id",
  authenticate,
  authorize("admin"),
  catalogProxy
);

catalogRouter.get("/health", catalogProxy);
catalogRouter.get("/products", catalogProxy);
catalogRouter.get("/products/:id", catalogProxy);
catalogRouter.get("/services", catalogProxy);
catalogRouter.get("/services/:id", catalogProxy);

export default catalogRouter;
