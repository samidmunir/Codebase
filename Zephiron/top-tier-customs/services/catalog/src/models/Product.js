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
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
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
