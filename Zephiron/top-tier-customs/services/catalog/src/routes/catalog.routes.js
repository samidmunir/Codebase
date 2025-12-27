import express from "express";
import { getAllProducts, health } from "../controllers/catalog.controller.js";

const catalogRouter = express.Router();

catalogRouter.get("/health", health);

catalogRouter.get("/products", getAllProducts);

export default catalogRouter;
