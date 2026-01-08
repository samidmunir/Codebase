import ENV from "../config/env.js";
import Stripe from "stripe";

export const stripe = new Stripe(ENV.STRIPE_SECRET);
