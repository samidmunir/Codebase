import express from "express";
import { health } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.get("/health", health);

export default authRouter;
