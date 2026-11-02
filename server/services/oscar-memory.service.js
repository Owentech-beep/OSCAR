import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";

const MAX_MESSAGES = 20;

function validateUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    const error = new Error("A valid conversation user ID is required.");
    error.statusCode = 400;
    throw error;
  }
}

export async function getConversation(userId) {
  validateUserId(userId);

  const conversation = await Conversation.findById(userId)
    .select("messages")
    .lean();

  return conversation?.messages ?? [];
}

export async function addMessage(userId, role, content) {
  validateUserId(userId);

  if (!["user", "assistant"].includes(role)) {
    throw new Error("Unsupported conversation message role.");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Conversation message content is required.");
  }

  const update = {
    $push: {
      messages: {
        $each: [
          {
            role,
            content,
            createdAt: new Date(),
          },
        ],
        $slice: -MAX_MESSAGES,
      },
    },
  };

  let conversation;

  try {
    conversation = await Conversation.findOneAndUpdate(
      { _id: userId },
      update,
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    ).lean();
  } catch (error) {
    // Two first messages may attempt to create the same user's
    // conversation simultaneously. Retry against the created document.
    if (error.code !== 11000) throw error;

    conversation = await Conversation.findOneAndUpdate(
      { _id: userId },
      update,
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!conversation) throw error;
  }

  return conversation.messages;
}

export async function clearConversation(userId) {
  validateUserId(userId);
  await Conversation.deleteOne({ _id: userId });
}