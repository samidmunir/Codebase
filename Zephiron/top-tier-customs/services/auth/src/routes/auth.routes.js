import express from "express";
import { health, signup } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.get("/health", health);

authRouter.post("/signup", signup);

export default authRouter;
