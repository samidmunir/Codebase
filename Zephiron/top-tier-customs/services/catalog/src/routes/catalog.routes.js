import express from "express";
import {
  createProduct,
  getAllProducts,
  health,
  updateProduct,
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

catalogRouter.get("/health", health);
catalogRouter.get("/products", getAllProducts);

export default catalogRouter;
