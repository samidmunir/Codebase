import mongoose from "mongoose";

const stripeEventSchema = new mongoose.Schema(
  {
    eventID: {
      type: String,
      unique: true,
      index: true,
    },
    type: {
      type: String,
    },
    processedAt: {
      type: Date,
      default: Date.now(),
    },
  },
  { timestamps: true }
);

const StripeEvent = mongoose.model("StripeEvents", stripeEventSchema);

export default StripeEvent;
