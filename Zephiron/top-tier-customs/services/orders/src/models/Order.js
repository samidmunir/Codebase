import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Snapshot at purchase time (don’t trust live catalog values later)
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, required: true },
        sku: { type: String },
        title: { type: String },
        qty: { type: Number, required: true, min: 1 },
        unitPriceCents: { type: Number, required: true, min: 0 },
        stripePriceId: { type: String, required: true }, // Stripe Price used in checkout
      },
    ],

    currency: { type: String, default: "usd" },
    subtotalCents: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["pending_payment", "paid", "canceled", "refunded"],
      default: "pending_payment",
      index: true,
    },

    stripe: {
      checkoutSessionId: { type: String, index: true },
      paymentIntentId: { type: String, index: true },
    },

    // Idempotency: track Stripe event IDs we already applied
    appliedStripeEventIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Orders", orderSchema);
