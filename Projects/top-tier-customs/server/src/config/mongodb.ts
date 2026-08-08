import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error(
        "--> MONGO_URI is not defined in the environment variables.",
      );
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(
      `--> top-tier-customs + MongoDB connection successful: [${conn.connection.host}]`,
    );
  } catch (error) {
    console.error(
      "--> *** ERROR *** : top-tier-customs + MongoDB connection failed!",
    );

    if (error instanceof Error) {
      console.error(`--> Error > message: ${error.message}`);
    } else {
      console.error("--> " + error);
    }

    process.exit(1);
  }
};
