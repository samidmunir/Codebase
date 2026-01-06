import mongoose from "mongoose";

const ProductImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductVariantSchema = new mongoose.Schema(
  {
    sku: { type: String, trim: true },
    name: { type: String, required: true },
    options: { type: Map, of: String, default: {} }, // e.g. { finish: "matte", color: "black" }

    priceCents: { type: Number, required: true, min: 0 },
    compareAtPriceCents: { type: Number, min: 0 },

    trackInventory: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0, min: 0 },

    images: { type: [ProductImageSchema], default: [] },

    stripe: {
      priceId: { type: String, index: true }, // Price for this variant
      currency: { type: String, default: "usd" },
      active: { type: Boolean, default: true },
      lastSyncAt: { type: Date },
    },

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    sku: {
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
      images: { type: [ProductImageSchema], default: [] },
    },

    categories: { type: [String], default: [], index: true },
    tags: { type: [String], default: [], index: true },

    // If no variants, use base price
    hasVariants: { type: Boolean, default: false },
    priceCents: { type: Number, min: 0 },
    compareAtPriceCents: { type: Number, min: 0 },

    discount: { type: Number }, // optional (prefer promos/coupons later)

    installable: { type: Boolean, required: true },

    trackInventory: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0, min: 0 }, // for non-variant products

    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },

    variants: { type: [ProductVariantSchema], default: [] },

    stripe: {
      productId: { type: String, index: true },
      // If no variants, store a single Price here:
      priceId: { type: String, index: true },
      currency: { type: String, default: "usd" },
      active: { type: Boolean, default: true },
      lastSyncAt: { type: Date },
      metadata: { type: Map, of: String, default: {} },
    },
  },
  { timestamps: true }
);

ProductSchema.index({
  title: "text",
  description: "text",
  sku: "text",
  tags: "text",
});

ProductSchema.pre("validate", function () {
  if (this.hasVariants) {
    if (!Array.isArray(this.variants) || this.variants.length === 0) {
      throw new Error("variants[] required when hasVariants=true");
    }
    this.priceCents = undefined;
    this.compareAtPriceCents = undefined;
    this.trackInventory = undefined;
    this.stockQty = undefined;
  } else {
    if (typeof this.priceCents !== "number") {
      throw new Error("priceCents required when hasVariants=false");
    }
    if (Array.isArray(this.variants) && this.variants.length > 0) {
      this.variants = [];
    }
  }
});

export default mongoose.model("Products", ProductSchema);
