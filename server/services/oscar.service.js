import { run } from "@openai/agents";
import oscarAgent from "../agents/oscar.agent.js";
import { env } from "../config/env.js";
import { getOscarBusinessContext } from "./oscar-context.service.js";
import { getConversation, addMessage } from "./oscar-memory.service.js";
import { oscarEvents } from "./oscar-events.service.js";
import { createOscarRunner } from "./oscar-runner.service.js";

export const runOscar = createOscarRunner({
  isConfigured: () => Boolean(env.OPENAI_API_KEY?.trim()),

  runAgent: (history, context) =>
    run(oscarAgent, history, { context }),

  getConversation,
  addMessage,
  getBusinessContext: getOscarBusinessContext,
  events: oscarEvents,
});