import express from "express";
import ENV from "./config/env.js";
import connectDB from "./config/db.js";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";

const app = express();

const PORT = ENV.PORT;
const CLIENT = ENV.CLIENT;

connectDB();

app.use(morgan("dev"));

app.use(cors({ origin: CLIENT, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.use("/", authRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/auth> live on http://localhost:${PORT}`);
});
