import express from "express";
import ENV from "./config/env.js";
import connectDB from "./config/db.js";
import morgan from "morgan";
import cors from "cors";
import ordersRouter from "./routes/orders.routes.js";

const app = express();

const PORT = ENV.PORT;
const CLIENT = ENV.CLIENT;

connectDB();

app.use(morgan("dev"));

app.use(cors({ origin: CLIENT, credentials: true }));

app.use(express.json());

app.use("/", ordersRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/orders> live on http://localhost:${PORT}`);
});
