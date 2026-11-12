import { requireOscarChannel } from "./oscar-channel.service.js";

// The original messages field remains the text-chat history. No migration needed.
export function createOscarConversationStore({ Conversation, validateUserId }) {
  function fieldFor(userId, channel) {
    validateUserId(userId);
    return requireOscarChannel(channel) === "voice" ? "voiceMessages" : "messages";
  }

  async function getConversation(userId, channel = "chat") {
    const field = fieldFor(userId, channel);
    const record = await Conversation.findById(userId).select(field).lean();
    return record?.[field] ?? [];
  }

  async function addMessage(userId, role, content, channel = "chat") {
    const field = fieldFor(userId, channel);
    if (!["user", "assistant"].includes(role)) {
      throw new Error("Unsupported conversation message role.");
    }
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Conversation message content is required.");
    }

    const update = {
      $push: {
        [field]: {
          $each: [{ role, content, createdAt: new Date() }],
          $slice: -20,
        },
      },
    };
    let record;
    try {
      record = await Conversation.findOneAndUpdate({ _id: userId }, update, {
        upsert: true,
        new: true,
        runValidators: true,
      }).lean();
    } catch (error) {
      if (error.code !== 11000) throw error;
      record = await Conversation.findOneAndUpdate({ _id: userId }, update, {
        new: true,
        runValidators: true,
      }).lean();
      if (!record) throw error;
    }
    return record[field];
  }

  async function clearConversation(userId, channel = "chat") {
    const field = fieldFor(userId, channel);
    // Clear only the requested channel, preserving the other history.
    await Conversation.updateOne(
      { _id: userId },
      { $set: { [field]: [] } },
      { runValidators: true },
    );
  }

  return { getConversation, addMessage, clearConversation };
}
