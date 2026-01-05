import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
    },
    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true,
    },

    profile: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true },
    },

    // Security ops (optional, but useful)
    secOps: {
      tokenVersion: { type: Number, default: 0 },
      lastLoginAt: { type: Date },
      failedLogins: { type: Number, default: 0 },
      lastPasswordResetAt: { type: Date },
      failedResets: { type: Number, default: 0 },
      lockedUntil: { type: Date },
    },

    // Stripe mapping
    stripe: {
      customerId: { type: String, index: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Users", UserSchema);
