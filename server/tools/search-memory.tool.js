import { tool } from "@openai/agents";
import { z } from "zod";

import { User } from "../models/User.js";
import { requireToolContext } from "./tool-context.js";
import { assertCanPerformAction } from "../services/authorization.service.js";
import { searchMemory } from "../services/memory.service.js";

export const searchMemoryTool = tool({
  name: "search_memory",

  description:
    "Search the authenticated user's saved long-term memories. " +
    "Use for previously saved preferences, decisions, and business context. " +
    "Search matches literal text. Saved memories may be outdated; " +
    "use business tools to verify current records.",

  parameters: z.object({
    query: z
      .string()
      .max(1000)
      .describe(
        "A short literal search phrase. Use an empty string to retrieve top memories.",
      ),

    type: z
      .enum(["business", "client", "lead", "preference", "long_term"])
      .nullable()
      .describe("Memory category, or null for all categories."),

    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("Maximum memories to return. Usually 5."),
  }),

    execute: executeSearchMemory,
});

export async function executeSearchMemory(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const actor = await User.findById(auth.userId)
        .select("role active")
        .lean();

      assertCanPerformAction(actor, "search_memory");

      const memories = await searchMemory({
        userId: auth.userId,
        query: input.query,
        type: input.type || "",
        limit: input.limit,
      });

      return {
        success: true,
        data: {
          count: memories.length,
          memories: memories.map((memory) => ({
            id: memory._id.toString(),
            type: memory.type,
            content: memory.content,
            source: memory.source,
            importance: memory.importance,
            clientId: memory.clientId?.toString() ?? null,
            leadId: memory.leadId?.toString() ?? null,
            updatedAt: memory.updatedAt,
          })),
        },
      };
    } catch (error) {
      if (error.code === "ACTION_NOT_AUTHORIZED") {
        return {
          success: false,
          error: "You are not authorized to search saved memories.",
        };
      }

      console.error("search_memory tool failed:", error);

      return {
        success: false,
        error: "Unable to retrieve saved memories.",
      };
    }
}