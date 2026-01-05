import express from "express";
import { internalize } from "../middleware/internal.middleware.js";
import {
  create,
  getOrder,
  health,
  markPaid,
} from "../controllers/orders.controller.js";

const ordersRouter = express.Router();

ordersRouter.post("/", internalize, create);
ordersRouter.get("/:id", internalize, getOrder);
ordersRouter.post("/:id", internalize, markPaid);

ordersRouter.get("/health", health);

export default ordersRouter;
