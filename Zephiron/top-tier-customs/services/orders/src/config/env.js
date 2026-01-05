import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  INTERNAL_SECRET: process.env.INTERNAL_SERVICE_SECRET,
};

export default ENV;
