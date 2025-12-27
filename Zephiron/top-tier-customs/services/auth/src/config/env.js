import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  JWT: {
    ACCESS: process.env.JWT_ACCESS_SECRET,
    ACCESS_TTL: process.env.JWT_ACCESS_TTL,
    REFRESH: process.env.JWT_REFRESH_SECRET,
    REFRESH_TTL: process.env.JWT_REFRESH_TTL,
  },
  CLIENT: process.env.CLIENT_ORIGIN,
};

export default ENV;
