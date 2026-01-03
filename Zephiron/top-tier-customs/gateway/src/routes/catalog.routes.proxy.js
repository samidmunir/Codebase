import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import ENV from "../config/env.js";

const catalogRouter = express.Router();

const catalogProxy = createProxyMiddleware({
  target: ENV.UPSTREAM.CATALOG,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      // console.log(
      //   "[GATEWAY] proxying to catalog:",
      //   req.method,
      //   req.originalUrl
      // );
      // console.log("[GATEWAY] setting x-gateway-secret:", ENV.SECRET);
      proxyReq.setHeader("x-gateway-secret", ENV.SECRET);
      if (req.user) {
        // console.log("[GATEWAY] req.user exists!");
        proxyReq.setHeader("x-user-id", req.user.sub);
        proxyReq.setHeader("x-user-email", req.user.email);
        proxyReq.setHeader("x-user-role", req.user.role);
      }
    },
  },
  // onProxyReq: (proxyReq, req) => {
  //   console.log("[GATEWAY] proxying to catalog:", req.method, req.originalUrl);
  //   console.log("[GATEWAY] setting x-gateway-secret:", ENV.SECRET);
  //   proxyReq.setHeader("x-gateway-secret", ENV.SECRET);
  //   if (req.user) {
  //     proxyReq.setHeader("x-user-id", req.user.sub);
  //     proxyReq.setHeader("x-user-email", req.user.email);
  //     proxyReq.setHeader("x-user-role", req.user.role);
  //   }
  // },
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

// import express from "express";
// import { createProxyMiddleware } from "http-proxy-middleware";
// import ENV from "../config/env.js";

// const catalogProxy = express.Router();

// const target = ENV.UPSTREAM.CATALOG;

// catalogProxy.use("/", createProxyMiddleware({ target, changeOrigin: true }));

// export default catalogProxy;
