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
    message: `/api/gateway is live on http://localhost:${PORT}/api/v0/`,
    ok: true,
    source: "<api.v0.gateway>: health()",
  });
});

app.use("/api/v0/auth", authProxyRouter);
app.use("/api/v0/catalog", catalogProxyRouter);

app.listen(PORT, () => {
  console.log(`\n✅ <api/v0/gateway> live on http://localhost:${PORT}/api/v0/`);
});
