import mongoose from "mongoose";

const ServiceImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ServiceSchema = new mongoose.Schema(
  {
    sid: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    media: {
      images: { type: [ServiceImageSchema], default: [] },
    },

    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd" },

    deposit: {
      required: { type: Boolean, default: false },
      type: { type: String, enum: ["fixed", "percent"] },
      amountCents: { type: Number, min: 0 }, // if fixed
      percent: { type: Number, min: 0, max: 100 }, // if percent
    },

    discount: {
      active: { type: Boolean, default: false },
      message: { type: String, trim: true },
      amountCents: { type: Number, min: 0 }, // prefer cents if you actually discount services
    },

    duration: {
      minMinutes: { type: Number, required: true, min: 1 },
      maxMinutes: { type: Number, required: true, min: 1 },
    },

    isActive: { type: Boolean, default: true, index: true },

    // Optional: if you want a Stripe Product for services (not required for PaymentIntents)
    stripe: {
      productId: { type: String },
      lastSyncAt: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Services", ServiceSchema);
