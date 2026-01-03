import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    sku: {
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
    stripe: {
      productID: {
        type: String,
        index: true,
      },
      priceID: {
        type: String,
        index: true,
      },
      currency: {
        type: String,
        default: "usd",
      },
      active: {
        type: Boolean,
        default: true,
      },
      lastSyncAt: {
        type: Date,
      },
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: {
        type: String,
        enum: ["fixed", "percent"],
      },
      amount: {
        type: Number,
      },
    },
    installable: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Products", productSchema);

export default Product;
