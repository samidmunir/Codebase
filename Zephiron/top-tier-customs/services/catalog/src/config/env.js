import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SECRET: process.env.GATEWAY_SHARED_SECRET,
  MONGO_URI: process.env.MONGO_URI,
  CLIENT: process.env.CLIENT_ORIGIN,
};

export default ENV;
