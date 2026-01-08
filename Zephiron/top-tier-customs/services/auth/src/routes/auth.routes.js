import express from "express";
import {
  getUser,
  health,
  login,
  logout,
  setCustomerStripeID,
  signup,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.get("/health", health);
authRouter.get("/internal/users/:id", getUser);
authRouter.put("/internal/users/:id/stripe-customer", setCustomerStripeID);
authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);

export default authRouter;
