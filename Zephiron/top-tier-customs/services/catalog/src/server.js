import express from "express";
import ENV from "./config/env.js";
import connectDB from "./config/db.js";
import morgan from "morgan";
import cors from "cors";
import catalogRouter from "./routes/catalog.routes.js";

const app = express();

const PORT = ENV.PORT;

connectDB();

app.use(morgan("dev"));

app.use(cors({ origin: ENV.CLIENT, credentials: true }));

app.use(express.json());

app.use("/", catalogRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/catalog> live on http://localhost:${PORT}`);
});
