import ENV from "../config/env.js";
import { getOrder } from "../client/orders.client.js";
import { ensureStripeCustomerForUser } from "../client/stripe.client.js";
import { stripe } from "../config/stripe.js";

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.payments.controller>: health()",
    message: `/api/payments is live on http://localhost:${ENV.PORT}`,
  });
};

export const checkout = async (req, res) => {
  try {
    const { orderID } = req.body || {};
    if (!orderID) {
      return res.status(400).json({ ok: false, message: "Missing orderID" });
    }

    const order = await getOrder(orderID);

    // Make sure these match your Orders service response keys
    // if (String(order.userID) !== String(req.userID)) {
    //   return res
    //     .status(403)
    //     .json({ ok: false, message: "Order does not belong to user." });
    // }

    const customerID = await ensureStripeCustomerForUser(req.userID);

    // ⚠️ Ensure item path matches your Order items structure
    const line_items = (order.order.items || []).map((item) => {
      const priceId = item?.stripe?.priceID || item?.stripePriceId;
      if (!priceId) {
        throw new Error("Order item missing Stripe price id.");
      }
      return { price: priceId, quantity: item.qty };
    });

    if (line_items.length === 0) {
      return res
        .status(400)
        .json({ ok: false, order: order, message: "Order has no items." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerID,
      line_items,
      success_url: `${ENV.CLIENT}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ENV.CLIENT}/checkout/cancel`,
      metadata: {
        kind: "order",
        orderID: String(orderID),
        userID: String(req.userID),
      },
    });

    return res.json({ ok: true, url: session.url });
  } catch (err) {
    return res.status(400).json({ ok: false, message: err.message });
  }
};
