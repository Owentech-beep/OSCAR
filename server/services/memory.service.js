import { z } from "zod";
import { Memory } from "../models/Memory.js";

const objectId = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  "A valid MongoDB ID is required.",
);

const optionalId = z.union([objectId, z.literal("")]).optional();

const memoryType = z.enum([
  "business",
  "client",
  "lead",
  "preference",
  "long_term",
]);

const saveInput = z.object({
  userId: objectId,
  type: memoryType,
  content: z.string().trim().min(1).max(5000),
  importance: z.number().finite().min(0).max(1).default(0.5),
  source: z.enum(["user", "oscar", "system"]).default("oscar"),
  clientId: optionalId,
  leadId: optionalId,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const searchInput = z.object({
  userId: objectId,
  query: z.string().trim().max(1000).default(""),
  type: z.union([memoryType, z.literal("")]).default(""),
  clientId: optionalId,
  leadId: optionalId,
  limit: z.number().int().min(1).max(50).default(10),
});

function validate(schema, input) {
  const result = schema.safeParse(input);

  if (!result.success) {
    const error = new Error(
      result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );

    error.statusCode = 400;
    throw error;
  }

  return result.data;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function saveMemory(input = {}) {
  const data = validate(saveInput, input);

  // Empty optional IDs mean no linked record.
  if (!data.clientId) delete data.clientId;
  if (!data.leadId) delete data.leadId;

  return Memory.create(data);
}

export async function searchMemory(input = {}) {
  const data = validate(searchInput, input);

  const filter = {
    userId: data.userId,
  };

  if (data.type) filter.type = data.type;
  if (data.clientId) filter.clientId = data.clientId;
  if (data.leadId) filter.leadId = data.leadId;

  if (data.query) {
    filter.content = {
      $regex: escapeRegex(data.query),
      $options: "i",
    };
  }

  return Memory.find(filter)
    .sort({
      importance: -1,
      updatedAt: -1,
      _id: -1,
    })
    .limit(data.limit)
    .lean();
}