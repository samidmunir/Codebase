import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SECRET: process.env.GATEWAY_SHARED_SECRET,
  JWT: {
    ACCESS: process.env.JWT_ACCESS_SECRET,
    ACCESS_TTL: process.env.JWT_ACCESS_TTL,
    REFRESH: process.env.JWT_REFRESH_SECRET,
    REFRESH_TTL: process.env.JWT_REFRESH_TTL,
  },
  CLIENT: process.env.CLIENT_ORIGIN,
  UPSTREAM: {
    AUTH: process.env.AUTH_SERVICE_URL,
    CATALOG: process.env.CATALOG_SERVICE_URL,
    PAYMENTS: process.env.PAYMENTS_SERVICE_URL,
    ORDERS: process.env.ORDERS_SERVICE_URL,
  },
};

export default ENV;
