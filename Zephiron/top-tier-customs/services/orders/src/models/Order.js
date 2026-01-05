import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Snapshot at purchase time (don’t trust live catalog values later)
    items: [
      {
        productID: { type: mongoose.Schema.Types.ObjectId, required: true },
        sku: { type: String },
        title: { type: String },
        qty: { type: Number, required: true, min: 1 },
        unitPriceCents: { type: Number, required: true, min: 0 },
        stripePriceID: { type: String, required: true }, // Stripe Price used in checkout
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
      checkoutSessionID: { type: String, index: true },
      paymentIntentID: { type: String, index: true },
    },

    // Idempotency: track Stripe event IDs we already applied
    appliedStripeEventIDs: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Orders", orderSchema);
