import express from "express";
import { checkout, health } from "../controllers/payments.controller.js";

const paymentsRouter = express.Router();

paymentsRouter.get("/health", health);
paymentsRouter.post("/checkout-session", checkout);

export default paymentsRouter;
