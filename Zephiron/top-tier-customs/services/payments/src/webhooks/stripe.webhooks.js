import { stripe } from "../config/stripe.js";
import ENV from "../config/env.js";
import StripeEvent from "../models/StripeEvent.js";
import { markOrderPaid } from "../client/orders.client.js";

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.STRIPE.WEBHOOK_SECRET
    );
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  const exists = await StripeEvent.findOne({ eventID: event.id }).lean();
  if (exists) {
    return res.json({ received: true, idempotent: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const kind = session.metadata?.kind;
      const orderID = session.metadata?.orderID;

      if (kind === "order" && orderID) {
        await markOrderPaid(orderID, {
          stripeEventID: event.id,
          checkoutSessionID: session.id,
          paymentIntentID: session.payment_intent || undefined,
        });
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const kind = pi.metadata?.kind;
      const bookingID = pi.metadata?.bookingID;

      if (kind === "deposit" && bookingID) {
        //
      }
    }

    await StripeEvent.create({ eventID: event.id, type: event.type });
    return res.json({ received: true });
  } catch (e) {
    return res.status(500).send(`Webhook handler failed: ${e.message}`);
  }
};
