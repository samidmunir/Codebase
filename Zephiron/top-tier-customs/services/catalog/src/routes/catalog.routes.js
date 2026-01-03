import express from "express";
import {
  createProduct,
  createService,
  deleteProduct,
  deleteService,
  getAllProducts,
  getAllServices,
  getProduct,
  getService,
  health,
  updateProduct,
  updateService,
} from "../controllers/catalog.controller.js";
import { gatewayCheck, authorize } from "../middleware/auth.middleware.js";

const catalogRouter = express.Router();

catalogRouter.post("/admin/products", gatewayCheck, authorize, createProduct);
catalogRouter.put(
  "/admin/products/:id",
  gatewayCheck,
  authorize,
  updateProduct
);
catalogRouter.delete(
  "/admin/products/:id",
  gatewayCheck,
  authorize,
  deleteProduct
);

catalogRouter.post("/admin/services", gatewayCheck, authorize, createService);
catalogRouter.put(
  "/admin/services/:id",
  gatewayCheck,
  authorize,
  updateService
);
catalogRouter.delete(
  "/admin/services/:id",
  gatewayCheck,
  authorize,
  deleteService
);

catalogRouter.get("/health", health);
catalogRouter.get("/products", getAllProducts);
catalogRouter.get("/products/:id", getProduct);
catalogRouter.get("/services", getAllServices);
catalogRouter.get("/services/:id", getService);

export default catalogRouter;
