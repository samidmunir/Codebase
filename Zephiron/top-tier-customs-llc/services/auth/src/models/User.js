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
      vehicles: {
        type: [
          {
            make: String,
            model: String,
            year: String,
          },
        ],
      },
    },
    billing: {
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      country: {
        type: String,
      },
      postal_code: {
        type: String,
      },
    },
    shipping: {
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      country: {
        type: String,
      },
      postal_code: {
        type: String,
      },
    },
    settings: {
      notifications: {
        new_products: {
          type: Boolean,
          default: false,
        },
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
