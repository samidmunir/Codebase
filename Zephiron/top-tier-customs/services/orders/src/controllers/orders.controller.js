import mongoose from "mongoose";
import ENV from "../config/env.js";
import Order from "../models/Order.js";
import { quoteCart } from "../client/catalog.client.js";

const PORT = ENV.PORT;

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.orders.controller>: health()",
    message: `/api/orders is live on http://localhost:${PORT}`,
  });
};

/**
 * POST /api/orders
 * Body:
 * {
 *   "items": [
 *     { "productId": "…", "qty": 2 },
 *     { "productId": "…", "variantId": "…", "qty": 1 }
 *   ],
 *   "notes": "optional"
 * }
 *
 * Creates an Order by calling Catalog internally to compute authoritative line items
 * (title/price/stripePriceId/inventory checks), then snapshots into Orders DB.
 */
export const create = async (req, res) => {
  try {
    const userId = req.userId || req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({
        ok: false,
        source: "<api.orders.controller>: createOrder()",
        message: "Unauthorized (missing userId).",
      });
    }

    const { items, notes } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        source: "<api.orders.controller>: createOrder()",
        message: "items[] is required.",
      });
    }

    // Validate + normalize user input (Orders validates IDs/qty but does not price anything)
    const normalized = items.map((it, idx) => {
      const productId = it?.productId;
      const variantId = it?.variantId;
      const qty = Number(it?.qty);

      if (!mongoose.isValidObjectId(productId)) {
        throw Object.assign(new Error(`items[${idx}].productId is invalid`), {
          status: 400,
        });
      }
      if (variantId && !mongoose.isValidObjectId(variantId)) {
        throw Object.assign(new Error(`items[${idx}].variantId is invalid`), {
          status: 400,
        });
      }
      if (!Number.isInteger(qty) || qty < 1) {
        throw Object.assign(
          new Error(`items[${idx}].qty must be an integer >= 1`),
          { status: 400 }
        );
      }

      return {
        productId: String(productId),
        variantId: variantId ? String(variantId) : undefined,
        qty,
      };
    });

    // --- Call Catalog internally to quote the cart ---
    // Catalog should:
    // - validate product exists/isActive
    // - validate variant (if needed)
    // - check inventory (optional)
    // - ensure stripePriceId exists (sync-to-stripe must be done first)
    // - return authoritative unitPriceCents/title/sku/stripePriceId
    const quote = await quoteCart(normalized);

    if (!quote?.ok || !Array.isArray(quote.items) || quote.items.length === 0) {
      return res.status(400).json({
        ok: false,
        source: "<api.orders.controller>: createOrder()",
        message: "Catalog quote failed or returned no items.",
      });
    }

    // Build order snapshot from quote response
    const orderItems = quote.items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId || undefined,
      sku: it.sku,
      title: it.title,
      qty: it.qty,
      unitPriceCents: it.unitPriceCents,
      stripePriceId: it.stripePriceId,
    }));

    const subtotalCents = Number(quote.subtotalCents ?? 0);
    if (!Number.isFinite(subtotalCents) || subtotalCents < 0) {
      return res.status(400).json({
        ok: false,
        source: "<api.orders.controller>: createOrder()",
        message: "Invalid subtotal returned from Catalog.",
      });
    }

    // Totals — keep simple for now, easy to extend later
    const discountCents = 0;
    const taxCents = 0;
    const shippingCents = 0;

    const totalCents = subtotalCents - discountCents + taxCents + shippingCents;
    if (totalCents < 0) {
      return res.status(400).json({
        ok: false,
        source: "<api.orders.controller>: createOrder()",
        message: "Invalid totals computed.",
      });
    }

    const order = await Order.create({
      userId,
      status: "pending_payment",
      currency: quote.currency || "usd",
      subtotalCents,
      discountCents,
      taxCents,
      shippingCents,
      totalCents,
      items: orderItems,
      notes: typeof notes === "string" ? notes.trim() : undefined,
    });

    return res.status(201).json({
      ok: true,
      source: "<api.orders.controller>: createOrder()",
      message: "Order created successfully.",
      orderId: order._id,
      order,
    });
  } catch (err) {
    const status =
      err?.status && Number.isInteger(err.status) ? err.status : 500;

    return res.status(status).json({
      ok: false,
      source: "<api.orders.controller>: createOrder()",
      message: "Failed to create order.",
      error: err?.message || "Internal server error.",
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    // Owner or admin only
    // const requesterId = req.userId || req.headers["x-user-id"];
    // const role = req.userRole || req.headers["x-user-role"];

    // if (String(order.userId) !== String(requesterId)) {
    //   return res.status(403).json({ ok: false, message: "Forbidden" });
    // }

    return res.status(200).json({ ok: true, order: order });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, message: "Failed to fetch order", error: e.message });
  }
};

export const markPaid = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }

    const { stripeEventId, checkoutSessionId, paymentIntentId, customerId } =
      req.body || {};
    if (!stripeEventId) {
      return res
        .status(400)
        .json({ ok: false, message: "stripeEventId is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    // ✅ Idempotency: Stripe can retry events
    if (order.appliedStripeEventIds?.includes(stripeEventId)) {
      return res
        .status(200)
        .json({ ok: true, message: "Already applied", order });
    }

    // Allow only if not already paid/canceled
    if (order.status === "canceled" || order.status === "refunded") {
      return res.status(409).json({
        ok: false,
        message: `Cannot mark payment succeeded for order in status "${order.status}"`,
      });
    }

    order.status = "paid";
    order.appliedStripeEventIds = [
      ...(order.appliedStripeEventIds || []),
      stripeEventId,
    ];

    order.stripe = order.stripe || {};
    if (checkoutSessionId) order.stripe.checkoutSessionId = checkoutSessionId;
    if (paymentIntentId) order.stripe.paymentIntentId = paymentIntentId;
    if (customerId) order.stripe.customerId = customerId;

    await order.save();

    // TODO (later): trigger order confirmation email / event here

    return res
      .status(200)
      .json({ ok: true, message: "Order marked paid", order });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: "Failed to mark order paid",
      error: e.message,
    });
  }
};
