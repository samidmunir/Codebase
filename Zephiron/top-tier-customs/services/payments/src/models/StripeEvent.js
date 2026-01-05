import mongoose from "mongoose";

const StripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },

    // Optional correlation to your domain
    kind: {
      type: String,
      enum: ["order", "deposit", "refund", "unknown"],
      default: "unknown",
    },
    orderId: { type: mongoose.Schema.Types.ObjectId },
    bookingId: { type: mongoose.Schema.Types.ObjectId },

    // Useful Stripe refs
    stripe: {
      checkoutSessionId: { type: String, index: true },
      paymentIntentId: { type: String, index: true },
      customerId: { type: String, index: true },
    },

    processedAt: { type: Date, default: Date.now },
    processingError: { type: String },
  },
  { timestamps: true }
);

StripeEventSchema.index({ createdAt: -1 });

export default mongoose.model("Stripe_Events", StripeEventSchema);
