import { Schema, model, Document } from "mongoose";

export type UserRole = "admin" | "customer";

export interface ILocation {
  city: string;
  country: string;
}

export interface IAddress {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  dob?: string;

  location: ILocation;

  phone?: string;

  email: string;

  password: string;

  role: UserRole;

  billingAddress?: IAddress;

  shippingAddress?: IAddress;

  vehicles: string[];

  savedProducts: string[];

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    dob: {
      type: String,
    },

    location: {
      city: {
        type: String,
        required: true,
      },

      country: {
        type: String,
        required: true,
      },
    },

    phone: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
      default: "customer",
    },

    billingAddress: {
      name: String,
      address: String,
      city: String,
      postalCode: String,
      country: String,
    },

    shippingAddress: {
      name: String,
      address: String,
      city: String,
      postalCode: String,
      country: String,
    },

    vehicles: {
      type: [String],
      default: [],
    },

    savedProducts: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const User = model<IUser>("User", userSchema);

export default User;
