import ENV from "../config/env.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import mongoose from "mongoose";
import { stripe } from "../client/stripe.client.js";

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.catalog.controller>: health()",
    message: `/api/catalog is live on http://localhost:${ENV.PORT}`,
  });
};

const pickDefined = (obj, allowed) => {
  const out = {};
  for (const key of allowed) {
    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== undefined
    ) {
      out[key] = obj[key];
    }
  }
  return out;
};

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

// POST /internal/quote
// Body: { items: [{ productId, variantId?, qty }] }
export const quote = async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "items[] is required." });
    }

    const normalized = items.map((it, idx) => {
      const productId = it?.productId;
      const variantId = it?.variantId;
      const qty = Number(it?.qty);

      if (!mongoose.isValidObjectId(productId)) {
        throw new Error(`items[${idx}].productId is invalid`);
      }
      if (variantId && !mongoose.isValidObjectId(variantId)) {
        throw new Error(`items[${idx}].variantId is invalid`);
      }
      if (!Number.isInteger(qty) || qty < 1) {
        throw new Error(`items[${idx}].qty must be an integer >= 1`);
      }

      return { productId, variantId, qty };
    });

    const productIds = [...new Set(normalized.map((x) => x.productId))];

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    }).lean();

    const productById = new Map(products.map((p) => [String(p._id), p]));

    const quotedItems = [];
    let subtotalCents = 0;

    for (const line of normalized) {
      const product = productById.get(String(line.productId));
      if (!product) {
        return res.status(404).json({
          ok: false,
          message: `Product not found or inactive: ${line.productId}`,
        });
      }

      // Variant product
      if (product.hasVariants) {
        if (!line.variantId) {
          return res.status(400).json({
            ok: false,
            message: `variantId required for variant product ${product._id}`,
          });
        }

        const variant = (product.variants || []).find(
          (v) => String(v._id) === String(line.variantId)
        );

        if (!variant || variant.isActive === false) {
          return res.status(404).json({
            ok: false,
            message: `Variant not found or inactive: ${line.variantId}`,
          });
        }

        const stripePriceId = variant?.stripe?.priceId;
        if (!stripePriceId) {
          return res.status(400).json({
            ok: false,
            message: `Variant missing Stripe priceId (sync to Stripe first): ${line.variantId}`,
          });
        }

        if (variant.trackInventory === true) {
          const stockQty = Number(variant.stockQty ?? 0);
          if (stockQty < line.qty) {
            return res.status(409).json({
              ok: false,
              message: `Insufficient stock for variant: ${line.variantId}`,
            });
          }
        }

        const unitPriceCents = Number(variant.priceCents);
        subtotalCents += unitPriceCents * line.qty;

        quotedItems.push({
          productId: String(product._id),
          variantId: String(variant._id),
          sku: variant.sku || product.sku,
          title: `${product.title} - ${variant.name}`,
          qty: line.qty,
          unitPriceCents,
          stripePriceId,
        });

        continue;
      }

      // Non-variant product
      if (line.variantId) {
        return res.status(400).json({
          ok: false,
          message: `variantId should not be provided for non-variant product ${product._id}`,
        });
      }

      const stripePriceId = product?.stripe?.priceId;
      if (!stripePriceId) {
        return res.status(400).json({
          ok: false,
          message: `Product missing Stripe priceId (sync to Stripe first): ${product._id}`,
        });
      }

      if (product.trackInventory === true) {
        const stockQty = Number(product.stockQty ?? 0);
        if (stockQty < line.qty) {
          return res.status(409).json({
            ok: false,
            message: `Insufficient stock for product ${product._id}. Available: ${stockQty}`,
          });
        }
      }

      const unitPriceCents = Number(product.priceCents);
      subtotalCents += unitPriceCents * line.qty;

      quotedItems.push({
        productId: String(product._id),
        variantId: null,
        sku: product.sku,
        title: product.title,
        qty: line.qty,
        unitPriceCents,
        stripePriceId,
      });
    }

    return res.json({
      ok: true,
      currency: "usd",
      subtotalCents,
      items: quotedItems,
    });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const { q, active } = req.query;

    const filter = {};
    if (typeof active !== "undefined") {
      filter.isActive = active === "true";
    }
    if (q && typeof q === "string" && q.trim()) {
      filter.$text = { $search: q.trim() };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: getAllProducts()",
      message: "Products fetched successfully.",
      products,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: getAllProducts()",
      message: "Failed to fetch all products.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const productID = req.params.id;

    if (!mongoose.isValidObjectId(productID)) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: getProduct()",
        message: "Failed to fetch product.",
        error: "Invalid product ID.",
      });
    }

    const dbProduct = await Product.findById(productID);
    if (!dbProduct) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: getProduct()",
        message: "Failed to fetch product.",
        error: `No product found with ID: ${productID}.`,
      });
    }

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: getProduct()",
      message: "Product fetched successfully.",
      product: dbProduct,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: getProduct()",
      message: "Failed to fetch product.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const body = req.body || {};

    const sku = isNonEmptyString(body.sku) ? body.sku.trim().toLowerCase() : "";
    const title = isNonEmptyString(body.title) ? body.title.trim() : "";
    const description = isNonEmptyString(body.description)
      ? body.description.trim()
      : "";

    if (!sku || !title || !description) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: createProduct()",
        message: "Failed to create new product.",
        error: "sku, title, and description are required.",
      });
    }

    if (typeof body.installable !== "boolean") {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: createProduct()",
        message: "Failed to create new product.",
        error: "installable must be a boolean.",
      });
    }

    // Disallow setting Stripe fields from the client
    if (
      body.stripe ||
      (Array.isArray(body.variants) && body.variants.some((v) => v?.stripe))
    ) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: createProduct()",
        message: "Failed to create new product.",
        error: "Do not set stripe fields manually.",
      });
    }

    const hasVariants = body.hasVariants === true;

    // Validate price rules
    if (!hasVariants) {
      if (typeof body.priceCents !== "number" || body.priceCents < 0) {
        return res.status(400).json({
          ok: false,
          source: "<api.catalog.controller>: createProduct()",
          message: "Failed to create new product.",
          error: "priceCents (number >= 0) required when hasVariants=false.",
        });
      }
    } else {
      if (!Array.isArray(body.variants) || body.variants.length === 0) {
        return res.status(400).json({
          ok: false,
          source: "<api.catalog.controller>: createProduct()",
          message: "Failed to create new product.",
          error: "variants[] required when hasVariants=true.",
        });
      }
      for (const [i, v] of body.variants.entries()) {
        if (!isNonEmptyString(v?.name)) {
          return res.status(400).json({
            ok: false,
            source: "<api.catalog.controller>: createProduct()",
            message: "Failed to create new product.",
            error: `variants[${i}].name is required.`,
          });
        }
        if (typeof v?.priceCents !== "number" || v.priceCents < 0) {
          return res.status(400).json({
            ok: false,
            source: "<api.catalog.controller>: createProduct()",
            message: "Failed to create new product.",
            error: `variants[${i}].priceCents (number >= 0) is required.`,
          });
        }
      }
    }

    // Allowlist only (prevents junk fields)
    const ALLOWED = [
      "sku",
      "title",
      "description",
      "media",
      "categories",
      "tags",
      "installable",
      "hasVariants",
      "priceCents",
      "compareAtPriceCents",
      "discount",
      "trackInventory",
      "stockQty",
      "isActive",
      "isFeatured",
      "variants",
    ];

    const payload = pickDefined(body, ALLOWED);
    payload.sku = sku;
    payload.title = title;
    payload.description = description;
    payload.hasVariants = hasVariants;

    // sensible defaults
    if (typeof payload.isActive !== "boolean") payload.isActive = true;
    if (typeof payload.isFeatured !== "boolean") payload.isFeatured = false;

    // Ensure SKU uniqueness
    const exists = await Product.findOne({ sku: payload.sku }).lean();
    if (exists) {
      return res.status(409).json({
        ok: false,
        source: "<api.catalog.controller>: createProduct()",
        message: "Failed to create new product.",
        error: `Product with sku "${payload.sku}" already exists.`,
      });
    }

    const product = await Product.create(payload);

    return res.status(201).json({
      ok: true,
      source: "<api.catalog.controller>: createProduct()",
      message: "New product successfully created.",
      product,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: createProduct()",
      message: "Failed to create new product.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const productID = req.params.id;
    if (!mongoose.isValidObjectId(productID)) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: updateProduct()",
        message: "Failed to update product.",
        error: "Invalid product ID.",
      });
    }

    const dbProduct = await Product.findById(productID);
    if (!dbProduct) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: updateProduct()",
        message: "Failed to update product.",
        error: `No product found with ID: ${productID}.`,
      });
    }

    const body = req.body || {};

    // Block stripe updates here (should be separate sync endpoint)
    if (
      body.stripe ||
      (Array.isArray(body.variants) && body.variants.some((v) => v?.stripe))
    ) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: updateProduct()",
        message: "Failed to update product.",
        error: "Stripe fields cannot be updated via this endpoint.",
      });
    }

    const ALLOWED = [
      "sku",
      "title",
      "description",
      "media",
      "categories",
      "tags",
      "installable",
      "hasVariants",
      "priceCents",
      "compareAtPriceCents",
      "discount",
      "trackInventory",
      "stockQty",
      "isActive",
      "isFeatured",
      "variants",
    ];

    const patch = pickDefined(body, ALLOWED);

    // Normalize if provided
    if (patch.sku && isNonEmptyString(patch.sku))
      patch.sku = patch.sku.trim().toLowerCase();
    if (patch.title && isNonEmptyString(patch.title))
      patch.title = patch.title.trim();
    if (patch.description && isNonEmptyString(patch.description))
      patch.description = patch.description.trim();

    // If hasVariants is being changed or currently true, validate accordingly
    const nextHasVariants =
      typeof patch.hasVariants === "boolean"
        ? patch.hasVariants
        : dbProduct.hasVariants;

    if (!nextHasVariants) {
      // non-variant requires priceCents (either already exists or provided)
      const nextPrice =
        typeof patch.priceCents === "number"
          ? patch.priceCents
          : dbProduct.priceCents;

      if (typeof nextPrice !== "number") {
        return res.status(400).json({
          ok: false,
          source: "<api.catalog.controller>: updateProduct()",
          message: "Failed to update product.",
          error: "priceCents is required when hasVariants=false.",
        });
      }
    } else {
      // variant requires variants (either already exists or provided)
      const nextVariants = Array.isArray(patch.variants)
        ? patch.variants
        : dbProduct.variants;
      if (!Array.isArray(nextVariants) || nextVariants.length === 0) {
        return res.status(400).json({
          ok: false,
          source: "<api.catalog.controller>: updateProduct()",
          message: "Failed to update product.",
          error: "variants[] required when hasVariants=true.",
        });
      }
    }

    // Apply patch (only sent fields)
    Object.assign(dbProduct, patch);

    await dbProduct.save();

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: updateProduct()",
      message: "Product updated successfully.",
      product: dbProduct,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: updateProduct()",
      message: "Failed to update product.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const productID = req.params.id;

    if (!mongoose.isValidObjectId(productID)) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: deleteProduct()",
        message: "Failed to delete product.",
        error: "Invalid product ID.",
      });
    }

    const dbProduct = await Product.findByIdAndDelete(productID);
    if (!dbProduct) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: deleteProduct()",
        message: "Failed to delete product.",
        error: `No product found with ID: ${productID}.`,
      });
    }

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: deleteProduct()",
      message: `Successfully deleted product [${productID}]`,
      product: dbProduct,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: deleteProduct()",
      message: "Failed to delete product.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const syncProductToStripe = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ ok: false, message: "Product not found." });
    }

    // Optional guard: don't sync inactive products
    if (product.isActive === false) {
      return res
        .status(400)
        .json({ ok: false, message: "Cannot sync an inactive product." });
    }

    const currency =
      product?.stripe?.currency || process.env.STRIPE_CURRENCY || "usd";

    // 1) Ensure Stripe Product exists
    if (!product?.stripe?.productId) {
      const sp = await stripe.products.create({
        name: product.title,
        description: product.description?.slice(0, 500) || undefined,
        metadata: {
          catalogProductId: String(product._id),
          sku: product.sku,
          hasVariants: String(!!product.hasVariants),
        },
      });

      product.stripe = product.stripe || {};
      product.stripe.productId = sp.id;
      product.stripe.currency = currency;
    }

    // 2) Create Stripe Price(s)
    if (product.hasVariants) {
      if (!Array.isArray(product.variants) || product.variants.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "variants[] required for variant product.",
        });
      }

      for (const v of product.variants) {
        if (v.isActive === false) continue;

        // If the variant already has a priceId, we won't recreate unless price changed.
        // Minimal approach: create only if missing.
        if (!v?.stripe?.priceId) {
          const price = await stripe.prices.create({
            product: product.stripe.productId,
            currency,
            unit_amount: Number(v.priceCents),
            // Optional: make it easier to trace in Stripe
            nickname: `${product.title} - ${v.name}`,
            metadata: {
              catalogProductId: String(product._id),
              catalogVariantId: String(v._id),
              sku: v.sku || product.sku,
            },
          });

          v.stripe = v.stripe || {};
          v.stripe.priceId = price.id;
          v.stripe.currency = currency;
          v.stripe.active = true;
          v.stripe.lastSyncAt = new Date();
        }
      }

      // Keep product-level priceId empty for variant products
      product.stripe.priceId = undefined;
      product.stripe.lastSyncAt = new Date();
    } else {
      // Non-variant product → single Stripe Price
      if (!product?.stripe?.priceId) {
        const price = await stripe.prices.create({
          product: product.stripe.productId,
          currency,
          unit_amount: Number(product.priceCents),
          nickname: product.title,
          metadata: {
            catalogProductId: String(product._id),
            sku: product.sku,
          },
        });

        product.stripe.priceId = price.id;
        product.stripe.currency = currency;
        product.stripe.active = true;
        product.stripe.lastSyncAt = new Date();
      }
    }

    await product.save();

    return res.status(200).json({
      ok: true,
      message: "Product synced to Stripe successfully.",
      product,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: "Failed to sync product to Stripe.",
      error: e.message,
    });
  }
};

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find();

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: getAllServices()",
      message: "Services fetched successfully.",
      services: services,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: getAllServices()",
      message: "Failed to fetch all services.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const getService = async (req, res) => {
  try {
    const serviceID = req.params.id;

    const dbService = await Service.findById(serviceID);
    if (!dbService) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: getService()",
        message: "Failed to fetch service.",
        error: `No product found with ID: ${serviceID}.`,
      });
    }

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: getService()",
      message: "Service fetched successfully.",
      service: dbService,
    });
  } catch (e) {
    //
  }
};

export const createService = async (req, res) => {
  try {
    const { sid, title, description, price, deposit, duration } = req.body;
    if (!sid || !title || !description || !price || !deposit || !duration) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: createService()",
        message: "Failed to create new service.",
        error: "Missing required fields.",
      });
    }

    const service = await Service.create(req.body);

    return res.status(201).json({
      ok: true,
      source: "<api.catalog.controller>: createService()",
      message: "New service successfully created.",
      service: service,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: createService()",
      message: "Failed to create new service.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const updateService = async (req, res) => {
  try {
    const serviceID = req.params.id;

    const dbService = await Product.findById(serviceID);
    if (!dbService) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: updateService()",
        message: "Failed to update service.",
        error: `No service found with ID: ${serviceID}.`,
      });
    }

    const {
      sid,
      title,
      description,
      media,
      price,
      deposit,
      discount,
      duration,
    } = req.body;

    if (sid !== "" && dbService.sid !== sid) {
      dbService.sid = sid;
    }

    if (title !== "" && dbService.title !== title) {
      dbService.title = title;
    }

    if (description !== "" && dbService.description !== description) {
      dbService.description = description;
    }

    if (price !== 0.0 && dbService.price !== price) {
      dbService.price = price;
    }

    if (discount !== null && dbService.discount !== discount) {
      dbService.discount = discount;
    }

    if (deposit !== null && dbService.deposit !== deposit) {
      dbService.deposit = deposit;
    }

    if (duration !== null && dbService.duration !== duration) {
      dbService.duration = duration;
    }

    await dbService.save();

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: updateService()",
      message: "Service updated successfully.",
      service: dbService,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: updateService()",
      message: "Failed to update service.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};

export const deleteService = async (req, res) => {
  try {
    const serviceID = req.params.id;

    const dbService = await Product.findByIdAndDelete(serviceID);
    if (!dbService) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: deleteService()",
        message: "Failed to delete service.",
        error: `No service found with ID: ${serviceID}.`,
      });
    }

    const dbServices = await Service.find();

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: deleteService()",
      message: `Successfully deleted service [${serviceID}]`,
      serices: dbServices,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: deleteService()",
      message: "Failed to delete service.",
      error: "Internal server error.",
      e: e.message,
    });
  }
};
