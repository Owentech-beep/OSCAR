import mongoose from "mongoose";

const businessSettingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "business",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    email: {
      type: String,
      trim: true,
      maxlength: 254,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "BusinessSettings",
  businessSettingsSchema,
);