import mongoose from "mongoose";
import ENV from "./env.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.MONGO_URI);
    console.log(`✅ MongoDB <-> <api/auth>`);
    console.log(`-> [${conn.connection.host}]`);
  } catch (e) {
    console.log("❌ MongoDB <!-> <api/auth>");
    console.error(`MongoDB connection error:`, e);

    process.exit(1);
  }
};

export default connectDB;
