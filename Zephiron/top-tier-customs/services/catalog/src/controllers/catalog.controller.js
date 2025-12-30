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
      e: e.message,
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const productID = req.params.id;

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
    //
  }
};

export const createProduct = async (req, res) => {
  try {
    const { sku, title, description, price, installable } = req.body;
    if (!sku || !title || !description || !price || installable === null) {
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

export const updateProduct = async (req, res) => {
  try {
    const productID = req.params.id;

    const dbProduct = await Product.findById(productID);
    if (!dbProduct) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: updateProduct()",
        message: "Failed to update product.",
        error: `No product found with ID: ${productID}.`,
      });
    }

    const { title, description, media, price, discount, installable } =
      req.body;

    if (title !== "" && dbProduct.title !== title) {
      dbProduct.title = title;
    }

    if (description !== "" && dbProduct.description !== description) {
      dbProduct.description = description;
    }

    if (price !== 0.0 && dbProduct.price !== price) {
      dbProduct.price = price;
    }

    if (discount !== null && dbProduct.discount !== discount) {
      dbProduct.discount = discount;
    }

    if (installable !== null && dbProduct.installable !== installable) {
      dbProduct.installable = installable;
    }

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

    // const dbProduct = await Product.findById(productID);
    const dbProduct = await Product.findByIdAndDelete(productID);
    if (!dbProduct) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: updateProduct()",
        message: "Failed to update product.",
        error: `No product found with ID: ${productID}.`,
      });
    }

    const dbProducts = await Product.find();

    return res.status(200).json({
      ok: true,
      source: "<api.catalog.controller>: deleteProduct()",
      message: `Successfully deleted product [${productID}]`,
      products: dbProducts,
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
