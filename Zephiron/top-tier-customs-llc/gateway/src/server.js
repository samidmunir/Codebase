import express from "express";
import morgan from "morgan";
import cors from "cors";
import authRouter from "./routes/auth.proxy.route.js";
import ENV from "./config/env.js";

const app = express();

const PORT = ENV.PORT;
const CLIENT = ENV.CLIENT;

app.use(morgan("dev"));

app.use(cors({ origin: CLIENT, credentials: true }));

app.get("/health", (_req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.gateway>",
    message: "/api/gateway is live",
  });
});

app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/gateway> live on localhost:${PORT}`);
});
