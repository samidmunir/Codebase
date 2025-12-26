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
    password_last_reset: {
      type: String,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    token_version: {
      type: Number,
      default: 0,
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
      dob: {
        type: Date,
      },
      phone: {
        type: String,
      },
    },
    settings: {
      notifications: {
        order_updates: {
          type: Boolean,
          default: false,
        },
        booking_reminders: {
          type: Boolean,
          default: false,
        },
        promotions: {
          type: Boolean,
          default: false,
        },
      },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("Users", userSchema);

export default User;
