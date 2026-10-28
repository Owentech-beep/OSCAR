import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["business", "client", "lead", "preference", "long_term"],
      required: true,
      index: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      index: true,
    },

    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    importance: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
      index: true,
    },

    source: {
      type: String,
      enum: ["user", "oscar", "system"],
      default: "oscar",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

memorySchema.index({ userId: 1, type: 1, updatedAt: -1 });

export const Memory = mongoose.model("Memory", memorySchema);
