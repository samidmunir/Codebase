import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    variantId: { type: mongoose.Schema.Types.ObjectId }, // if using variants

    sku: { type: String },
    title: { type: String },

    qty: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },

    // Stripe price used at checkout time
    stripePriceId: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending_payment", "paid", "fulfilled", "canceled", "refunded"],
      default: "pending_payment",
      index: true,
    },

    currency: { type: String, default: "usd" },
    subtotalCents: { type: Number, required: true, min: 0 },
    discountCents: { type: Number, default: 0, min: 0 },
    taxCents: { type: Number, default: 0, min: 0 },
    shippingCents: { type: Number, default: 0, min: 0 },

    totalCents: { type: Number, required: true, min: 0 },

    items: { type: [OrderItemSchema], default: [] },

    stripe: {
      checkoutSessionId: { type: String, index: true },
      paymentIntentId: { type: String, index: true },
      customerId: { type: String, index: true },
    },

    // idempotency at the domain level
    appliedStripeEventIds: { type: [String], default: [] },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Orders", OrderSchema);
