import { Memory } from "../models/Memory.js";

export async function saveMemory({
  userId,
  type,
  content,
  importance = 0.5,
  source = "oscar",
  clientId,
  leadId,
  metadata = {},
}) {
  return Memory.create({
    userId,
    type,
    content,
    importance,
    source,
    clientId,
    leadId,
    metadata,
  });
}

export async function searchMemory({
  userId,
  query = "",
  type = "",
  clientId = "",
  leadId = "",
  limit = 10,
} = {}) {
  const filter = { userId };

  if (type) {
    filter.type = type;
  }

  if (clientId) {
    filter.clientId = clientId;
  }

  if (leadId) {
    filter.leadId = leadId;
  }

  if (query) {
    filter.content = {
      $regex: query,
      $options: "i",
    };
  }

  return Memory.find(filter)
    .sort({
      importance: -1,
      updatedAt: -1,
    })
    .limit(Math.min(limit, 50))
    .lean();
}