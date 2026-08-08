import express from "express";
import { health, register, login } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.get("/health", health);
authRouter.post("/register", register);
authRouter.post("/login", login);

export default authRouter;
