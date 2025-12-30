import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    sid: {
      type: String,
      unique: true,
      lowercase: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    media: {
      images: {
        type: [String],
      },
    },
    price: {
      type: Number,
      required: true,
    },
    deposit: {
      required: {
        type: Boolean,
        required: true,
      },
      amount: {
        type: Number,
      },
    },
    discount: {
      active: {
        type: Boolean,
      },
      message: {
        type: String,
      },
      amount: {
        type: Number,
      },
    },
    duration: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Services", serviceSchema);

export default Service;
