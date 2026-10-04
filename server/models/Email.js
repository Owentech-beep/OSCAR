import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      index: true,
    },

    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      required: true,
    },

    type: {
      type: String,
      enum: ["draft", "sent", "reply"],
      default: "draft",
    },

    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["draft", "pending_confirmation", "sent", "failed"],
      default: "draft",
    },

    sentAt: {
      type: Date,
    },

    providerMessageId: {
      type: String,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Email", emailSchema);
