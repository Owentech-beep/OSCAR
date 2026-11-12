import mongoose from "mongoose";

const conversationMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: {
      type: [conversationMessageSchema],
      default: [],
    },
    voiceMessages: {
      type: [conversationMessageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export const Conversation = mongoose.model(
  "Conversation",
  conversationSchema,
);
