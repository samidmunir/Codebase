import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import ENV from "../config/env.js";

const authProxy = express.Router();

const target = ENV.UPSTREAM.AUTH;

authProxy.use("/", createProxyMiddleware({ target, changeOrigin: true }));

export default authProxy;
