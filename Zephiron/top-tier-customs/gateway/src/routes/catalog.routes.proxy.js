import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import ENV from "../config/env.js";

const catalogProxy = express.Router();

const target = ENV.UPSTREAM.CATALOG;

catalogProxy.use("/", createProxyMiddleware({ target, changeOrigin: true }));

export default catalogProxy;
