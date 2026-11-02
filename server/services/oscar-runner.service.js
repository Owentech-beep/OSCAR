import {
  buildOscarHistory,
  withOscarRunLock,
} from "./oscar-run-guard.service.js";
import {
  classifyOscarRunResult,
  extractOscarConfirmation,
  extractOscarResponse,
} from "./oscar-result.service.js";

export function createOscarRunner({
  isConfigured,
  runAgent,
  getConversation,
  addMessage,
  getBusinessContext,
  events,
}) {
  return async function runOscar(message, context = {}) {
    const { userId } = context;

    if (typeof userId !== "string" || !userId.trim()) {
      throw new Error("OSCAR user context is missing.");
    }

    if (typeof message !== "string" || !message.trim()) {
      const error = new Error("A message is required.");
      error.statusCode = 400;
      throw error;
    }

    if (!isConfigured()) {
      const error = new Error(
        "OSCAR AI is not configured. Please add OPENAI_API_KEY.",
      );

      error.statusCode = 503;
      events.emitOffline(userId);
      throw error;
    }

    return withOscarRunLock(userId, async () => {
      try {
        events.emitStart(userId);
        events.emitThinking(userId);

        await addMessage(userId, "user", message.trim());

        const conversation = await getConversation(userId);
        const business = await getBusinessContext();

        const result = await runAgent(
          buildOscarHistory(conversation),
          { ...context, business },
        );

        const response = extractOscarResponse(result);

        if (typeof response !== "string" || !response.trim()) {
          const error = new Error("OSCAR returned no text response.");
          error.statusCode = 502;
          throw error;
        }

        await addMessage(userId, "assistant", response);

        const confirmation = extractOscarConfirmation(result);
        const outcome = classifyOscarRunResult(result);

        if (confirmation) {
          events.emitConfirmationRequired(userId, confirmation);
        } else if (outcome === "failed") {
          events.emitError(
            userId,
            new Error(
              "One or more requested operations failed. " +
              "Review OSCAR's response.",
            ),
          );
        } else if (outcome === "completed") {
          events.emitSuccess(userId);
        } else {
          events.emitCompleted(userId);
        }

        return { response, confirmation };
      } catch (error) {
        events.emitError(userId, error);
        throw error;
      }
    });
  };
}