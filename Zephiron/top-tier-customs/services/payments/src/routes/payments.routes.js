import express from "express";
import { checkout, health } from "../controllers/payments.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const paymentsRouter = express.Router();

paymentsRouter.get("/health", health);
paymentsRouter.post("/checkout-session", authenticate, checkout);

export default paymentsRouter;
