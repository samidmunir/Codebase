import ENV from "../config/env.js";
import Order from "../models/Order.js";

const PORT = ENV.PORT;

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.orders.controller>: health()",
    message: `/api/orders is live on http://localhost:${PORT}`,
  });
};

export const create = async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: "Missing items" });
  }

  let subtotalCents = 0;
  for (const it of items) {
    if (!it.productID || !it.stripePriceID || !it.qty || !it.unitPriceCents) {
      return res.status(400).json({ ok: false, message: "Invalid item" });
    }

    subtotalCents += Number(it.unitPriceCents) * Number(it.qty);
  }

  const order = await Order.create({
    userId: req.userID,
    items,
    subtotalCents,
    currency: "usd",
    status: "pending_payment",
  });

  return res.status(201).json({ ok: true, orderID: order._id });
};

export const getOrder = async (req, res) => {
  console.log(req.params.id);
  const order = await Order.findById(req.params.id).lean();
  if (!order) {
    return res.status(404).json({ ok: false, message: "Order not found." });
  }

  return res.json(order);
};

export const markPaid = async (req, res) => {
  const { stripeEventID, checkoutSessionID, paymentIntentID } = req.body || {};
  if (!stripeEventID) {
    return res
      .status(404)
      .json({ ok: false, message: "Missing stripeEventID" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ ok: false, message: "Order not found." });
  }

  // idempotency
  if (order.appliedStripeEventIds.includes(stripeEventID)) {
    return res.json({ ok: true, idempotent: true });
  }

  order.appliedStripeEventIds.push(stripeEventID);

  // only transition if not already paid
  if (order.status !== "paid") {
    order.status = "paid";
    if (checkoutSessionID) {
      order.stripe.checkoutSessionId = checkoutSessionID;
    }
    if (paymentIntentID) {
      order.stripe.paymentIntentId = paymentIntentID;
    }
  }

  await order.save();

  return res.json({ ok: true });
};
