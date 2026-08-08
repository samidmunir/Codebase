import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/mongodb.js";
import authRouter from "./auth/routes/auth.router.js";

dotenv.config();

const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(
    `\ntop-tier-customs API server is live on http://localhost:${PORT}`,
  );
  console.log(`--> NODE_ENV: ${NODE_ENV}`);
  connectDB();
});
