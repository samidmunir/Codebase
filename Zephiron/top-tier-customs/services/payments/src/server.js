import express from "express";
import ENV from "./config/env.js";
import connectDB from "./config/db.js";
import morgan from "morgan";
import cors from "cors";
import paymentsRouter from "./routes/payments.routes.js";
import webhookRouter from "./routes/webhooks.routes.js";

const app = express();

const PORT = ENV.PORT;

connectDB();

app.use(morgan("dev"));

app.use(cors({ origin: ENV.CLIENT, credentials: true }));

app.use("/stripe", webhookRouter);
app.use(express.json());

app.use("/", paymentsRouter);

app.listen(PORT, () => {
  console.log(`✅ <api/payments> live on http://localhost:${PORT}`);
});
