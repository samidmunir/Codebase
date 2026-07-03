import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  GATEWAY_SHARED_SECRET: process.env.GATEWAY_SHARED_SECRET,
  UPSTREAM: {
    AUTH: process.env.AUTH_SERVICE_URL,
  },
};
