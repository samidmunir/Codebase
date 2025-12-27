import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT: process.env.CLIENT_ORIGIN,
  UPSTREAM: {
    AUTH: process.env.AUTH_SERVICE_URL,
  },
};

export default ENV;
