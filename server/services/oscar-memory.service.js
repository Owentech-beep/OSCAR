import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { createOscarConversationStore } from "./oscar-conversation-store.service.js";

function validateUserId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    const error = new Error("A valid conversation user ID is required.");
    error.statusCode = 400;
    throw error;
  }
}

export const { getConversation, addMessage, clearConversation } =
  createOscarConversationStore({ Conversation, validateUserId });
