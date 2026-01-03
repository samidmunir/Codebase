import express from "express";
import { checkout } from "../controllers/payments.controller.js";

const paymentsRouter = express.Router();

paymentsRouter.post("", checkout);

export default paymentsRouter;
