import ENV from "../config/env.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";

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

    const dbService = await Product.findById(serviceID);
    if (!dbService) {
      return res.status(404).json({
        ok: false,
        source: "<api.catalog.controller>: getProduct()",
        message: "Failed to fetch product.",
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
