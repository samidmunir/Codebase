import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SECRET: process.env.GATEWAY_SHARED_SECRET,
  INTERNAL_SECRET: process.INTERNAL_SERVICE_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  STRIPE_SECRET: process.env.STRIPE_SECRET,
  CLIENT: process.env.CLIENT_ORIGIN,
};

export default ENV;
