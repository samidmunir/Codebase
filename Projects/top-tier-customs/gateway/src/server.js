import express from "express";
import morgan from "morgan";
import cors from "cors";
import { ENV } from "./config/env.js";
import authProxyRouter from "./routes/auth.routes.proxy.js";
import catalogProxyRouter from "./routes/catalog.routes.proxy.js";

const app = express();

const PORT = ENV.PORT;
const CLIENT = ENV.CLIENT_ORIGIN;

app.use(morgan("dev"));
app.use(cors({ origin: CLIENT, credentials: true }));

app.get("/api/v0/health", (_req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.v0.gateway>: health()",
    message: `/api/gateway is live on http://localhost:${PORT}/api/v0/`,
  });
});

app.use("/auth", authProxyRouter);
app.use("/catalog", catalogProxyRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/gateway> live on http://localhost:${PORT}/api/v0/`);
});
