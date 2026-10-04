import { run } from "@openai/agents";
import oscarAgent from "../agents/oscar.agent.js";
import { env } from "../config/env.js";
import { getOscarBusinessContext } from "./oscar-context.service.js";
import { getConversation, addMessage } from "./oscar-memory.service.js";

export const runOscar = async (message, context = {}) => {
  const { userId } = context;

  if (!userId) {
    throw new Error("OSCAR user context is missing.");
  }

  if (!env.OPENAI_API_KEY) {
    const error = new Error(
      "OSCAR AI is not configured. Please add OPENAI_API_KEY.",
    );

    error.statusCode = 503;

    throw error;
  }

  addMessage(userId, "user", message);

  const conversation = getConversation(userId);

  const businessContext = await getOscarBusinessContext();

  const conversationText = conversation
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join("\n");
  const agentContext = {
    ...context,
    business: businessContext,
  };
  const result = await run(oscarAgent, conversationText, {
    context: agentContext,
  });

  const response = result.finalOutput;

  addMessage(userId, "assistant", response);

  const confirmationItem = [...result.newItems]
    .reverse()
    .find(
      (item) =>
        item.type === "tool_call_output_item" &&
        item.output?.requiresConfirmation === true &&
        item.output?.confirmation,
    );

  return {
    response,
    confirmation: confirmationItem?.output?.confirmation ?? null,
  };
};
