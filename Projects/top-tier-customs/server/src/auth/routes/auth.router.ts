import express from "express";
import { health, register } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.get("/health", health);
authRouter.post("/register", register);

export default authRouter;
