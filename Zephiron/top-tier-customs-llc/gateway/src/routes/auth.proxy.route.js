import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import ENV from "../config/env.js";

const authRouter = express.Router();

const target = ENV.UPSTREAM.AUTH;

authRouter.use("/", createProxyMiddleware({ target, changeOrigin: true }));

export default authRouter;
