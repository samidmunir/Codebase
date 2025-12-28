import ENV from "../config/env.js";
import Product from "../models/Product.js";

export const health = async (req, res) => {
  return res.status(200).json({
    ok: true,
    source: "<api.catalog.controller>: health()",
    message: `/api/catalog is live on http://localhost:${ENV.PORT}`,
  });
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: getAllProducts()",
      message: "Products fetched successfully.",
      products: products,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      source: "<api.catalog.controller>: getAllProducts()",
      message: "Failed to fetch all products.",
      error: "Internal server error.",
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { sku, title, description, price, installable } = req.body;
    if (!sku || !title || !description || !price || !installable) {
      return res.status(400).json({
        ok: false,
        source: "<api.catalog.controller>: createProduct()",
        message: "Failed to create new product.",
        error: "Missing required fields.",
      });
    }

    const product = await Product.create(req.body);

    return res.status(201).json({
      ok: true,
      source: "<api.catalog.controller>: createProduct()",
      message: "New product successfully created.",
      product: product,
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
