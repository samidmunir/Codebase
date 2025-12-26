import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/auth.routes.js";
import ENV from "./config/env.js";

const app = express();

const PORT = ENV.PORT;

connectDB();

app.use(morgan("dev"));

app.use(cors({ origin: ENV.CLIENT, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  return res
    .status(200)
    .json({ ok: true, source: "<api.auth>", message: "/api/auth is live" });
});

app.use("/", authRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/auth> live on localhost:${PORT}`);
});
