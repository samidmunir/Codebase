import express from "express";
import { stripeWebhook } from "../webhooks/stripe.webhooks.js";

const webhookRouter = express.Router();

webhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

export default webhookRouter;
