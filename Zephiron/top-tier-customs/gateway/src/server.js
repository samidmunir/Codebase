import express from "express";
import ENV from "./config/env.js";
import morgan from "morgan";
import cors from "cors";
import authProxy from "./routes/auth.routes.proxy.js";

const app = express();

const PORT = ENV.PORT;
const CLIENT = ENV.CLIENT;

app.use(morgan("dev"));

app.use(cors({ origin: CLIENT, credentials: true }));

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.gateway>",
    message: `/api/gateway is live on http://localhost:${PORT}`,
  });
});

app.use("/api/auth", authProxy);

app.listen(PORT, () => {
  console.log(`✅ <api.gateway> live on http://localhost:${PORT}`);
});
