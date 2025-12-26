import dotenv from "dotenv";

dotenv.config();

const ENV = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  MONGO_URI: process.env.MONGO_URI,
  JWT: {
    AT: process.env.JWT_ACCESS_SECRET,
    RT: process.env.JWT_REFRESH_SECRET,
    AT_TTL: process.env.ACCESS_TOKEN_EXPIRES_IN,
    RT_TTL: process.env.REFRESH_TOKEN_EXPIRES_IN,
  },
  CLIENT: process.env.CLIENT_ORIGIN,
};

export default ENV;
