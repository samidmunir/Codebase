// import express from "express";
// import { stripeWebhook } from "../webhooks/stripe.webhooks.js";

// const webhookRouter = express.Router();

// webhookRouter.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   stripeWebhook
// );

// export default webhookRouter;

import express from "express";
import ENV from "../config/env.js";
import StripeEvent from "../models/StripeEvent.js";
import { stripe } from "../config/stripe.js";
import { markOrderPaid } from "../client/orders.client.js"; // internal call to Orders

const router = express.Router();

router.get("/", (req, res) => {
  return res
    .status(200)
    .json({ ok: true, message: "api/payments/stripe reached" });
});

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        ENV.STRIPE.WEBHOOK_SECRET
      );
    } catch (err) {
      console.log("webhook error!!!");
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Payments-level idempotency
    const exists = await StripeEvent.findOne({ eventId: event.id }).lean();
    if (exists) return res.json({ received: true, idempotent: true });

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderID = session.metadata?.orderID;

        if (session.metadata?.kind === "order" && orderID) {
          // Tell Orders service to mark paid (must be idempotent there too)
          await markOrderPaid(orderID, {
            stripeEventId: event.id,
            checkoutSessionId: session.id,
            paymentIntentId: session.payment_intent,
          });
        }
      }

      await StripeEvent.create({
        eventId: event.id,
        type: event.type,
        kind: "order",
        stripe: {
          checkoutSessionId: event.data?.object?.id,
          paymentIntentId: event.data?.object?.payment_intent,
        },
      });

      return res.json({ received: true });
    } catch (err) {
      // store failure for debugging/audit
      await StripeEvent.create({
        eventId: event.id,
        type: event.type,
        kind: "unknown",
        processingError: err.message,
      });

      return res.status(500).send(`Webhook handler failed: ${err.message}`);
    }
  }
);

export default router;
