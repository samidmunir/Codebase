import ENV from "../config/env.js";
import { getOrder } from "../client/orders.client.js";
import { ensureStripeCustomerForUser } from "../client/stripe.client.js";

export const checkout = async (req, res) => {
  const { orderID } = req.body;
  if (!orderID) {
    return res.status(400).json({ ok: false, message: "Missing orderID" });
  }

  const order = await getOrder(orderID);

  if (String(order.userID) !== String(req.userID)) {
    return res
      .status(403)
      .json({ ok: false, message: "Order does not belong to user." });
  }

  const customerID = await ensureStripeCustomerForUser(req.userID);

  const line_items = order.items.map((item) => ({
    price: item.stripe.priceID,
    quantity: item.qty,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerID,
    line_items,
    success_url: `${ENV.CLIENT}/checkout/success`,
    cancel_url: `${ENV.CLIENT}/checkout/cancel`,
    metadata: {
      kind: "order",
      orderID: String(orderID),
      userID: String(req.userID),
    },
  });

  return res.json({ ok: true, url: session.url });
};
