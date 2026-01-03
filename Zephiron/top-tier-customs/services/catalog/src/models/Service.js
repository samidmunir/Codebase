import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    sid: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    media: {
      images: {
        type: [String],
      },
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    stripe: {
      serviceID: { type: String },
      depositPriceID: { type: String },
    },
    deposit: {
      required: {
        type: Boolean,
        default: false,
        type: {
          type: String,
          enum: ["fixed", "percent"],
        },
        amountCents: {
          type: Number,
        },
        percent: {
          type: Number,
        },
      },
      discount: {
        active: {
          type: Boolean,
        },
        message: {
          type: String,
        },
        amount: {
          type: Number,
        },
      },
      duration: {
        min: {
          type: Number,
          required: true,
        },
        max: {
          type: Number,
          required: true,
        },
      },
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Services", serviceSchema);

export default Service;
