import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error(
        "\nMONGO_URI is not defined in the environment variables.",
      );
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(
      `\ntop-tier-customs + MongoDB connection successful: [${conn.connection.host}]`,
    );
  } catch (error) {
    console.error(
      "\n*** ERROR *** : top-tier-customs + MongoDB connection failed!",
    );

    if (error instanceof Error) {
      console.error(`\n--> Error > message: ${error.message}`);
    } else {
      console.error("\n" + error);
    }

    process.exit(1);
  }
};
