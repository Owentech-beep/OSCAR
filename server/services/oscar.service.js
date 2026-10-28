import { run } from "@openai/agents";
import oscarAgent from "../agents/oscar.agent.js";
import { env } from "../config/env.js";
import { getOscarBusinessContext } from "./oscar-context.service.js";
import { getConversation, addMessage } from "./oscar-memory.service.js";
import { oscarEvents } from "./oscar-events.service.js";
import {
  extractOscarConfirmation,
  extractOscarResponse,
} from "./oscar-result.service.js";

export const runOscar = async (message, context = {}) => {
  const { userId } = context;

  if (!userId) {
    throw new Error("OSCAR user context is missing.");
  }

  oscarEvents.emitStart(userId);
  oscarEvents.emitThinking(userId);

  if (!env.OPENAI_API_KEY) {
    const error = new Error(
      "OSCAR AI is not configured. Please add OPENAI_API_KEY.",
    );

    error.statusCode = 503;

    oscarEvents.emitOffline(userId);

    throw error;
  }

  try {
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

    const response = extractOscarResponse(result);

    addMessage(userId, "assistant", response);

    const confirmation = extractOscarConfirmation(result);

    if (confirmation) {
      oscarEvents.emitConfirmationRequired(
        userId,
        confirmation,
      );
    } else {
      oscarEvents.emitSuccess(userId);
    }

    return {
      response,
      confirmation,
    };
  } catch (error) {
    oscarEvents.emitError(userId, error);
    throw error;
  }
};
