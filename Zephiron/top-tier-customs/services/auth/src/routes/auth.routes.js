import express from "express";
import { health, login, signup } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.get("/health", health);

authRouter.post("/signup", signup);
authRouter.post("/login", login);

export default authRouter;
