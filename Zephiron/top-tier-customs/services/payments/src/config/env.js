import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  STRIPE: {
    SECRET: process.env.STRIPE_SECRET,
    WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  },
  CLIENT: process.env.CLIENT_ORIGIN,
  UPSTREAM: {
    AUTH: process.env.AUTH_SERVICE_URL,
    CATALOG: process.env.CATALOG_SERVICE_URL,
    ORDERS: process.env.ORDERS_SERVICE_URL,
  },
  INTERNAL_SECRET: process.env.INTERNAL_SERVICE_SECRET,
};

export default ENV;
