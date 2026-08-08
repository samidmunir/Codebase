import dotenv from "dotenv";
import express from "express";
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;

const app = express();

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(
    `top-tier-customs API server is live on http://localhost:${PORT}`,
  );
  console.log(`--> NODE_ENV: ${NODE_ENV}`);
});
