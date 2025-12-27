import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      enum: ["customer", "admin"],
      default: "customer",
    },
    profile: {
      first_name: {
        type: String,
        required: true,
      },
      last_name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
      },
    },
    sec_ops: {
      token_version: {
        type: Number,
      },
      last_login: {
        type: String,
      },
      failed_logins: {
        type: Number,
      },
      last_password_reset: {
        type: String,
      },
      failed_resets: {
        type: Number,
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("Users", userSchema);

export default User;
