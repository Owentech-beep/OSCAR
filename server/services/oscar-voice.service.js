import crypto from "node:crypto";
import { env } from "../config/env.js";

const OSCAR_VOICE_INSTRUCTIONS = `
You are OSCAR, the AI voice assistant for OwenTech's business operating system.

Speak English by default. Only change language when the user explicitly requests it.
If speech is unclear, ask the user to repeat it in English rather than guessing.
Use a calm, confident, masculine speaking style with a natural conversational pace.
Address the user as "Sir" respectfully and naturally.
Keep responses concise and allow the user to interrupt.

For questions about business records, leads, clients, projects,
invoices, or business actions, use the ask_oscar tool.
Explain tool results in English unless the user explicitly requests another language.

Never invent business data or claim an action succeeded without evidence.
Never bypass the application's authorization or confirmation workflow.
If an action requires confirmation, explain that approval is needed.

For general conversation, respond naturally without unnecessary tool calls.
`;

const OSCAR_VOICE_TOOLS = [
  {
    type: "function",
    name: "ask_oscar",
    description:
      "Send a business-related request to OSCAR's authenticated backend agent.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The user's business question or requested operation.",
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
];

export async function createOscarVoiceSession(userId) {
  if (!userId) {
    const error = new Error("Authenticated user ID is required.");
    error.statusCode = 401;
    throw error;
  }

  if (!env.OPENAI_API_KEY) {
    const error = new Error(
      "OSCAR Voice is not configured. Add OPENAI_API_KEY."
    );
    error.statusCode = 503;
    throw error;
  }

  const safetyIdentifier = crypto
    .createHash("sha256")
    .update(userId)
    .digest("hex");

  const openAIResponse = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifier,
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: env.OPENAI_REALTIME_SESSION_SECONDS,
        },
        session: {
          type: "realtime",
          model: env.OPENAI_REALTIME_MODEL,
          instructions: OSCAR_VOICE_INSTRUCTIONS,
          audio: {
            input: {
              turn_detection: {
                type: "server_vad",
              },
            },
            output: {
              voice: env.OPENAI_REALTIME_VOICE,
            },
          },
          tools: OSCAR_VOICE_TOOLS,
          tool_choice: "auto",
        },
      }),
    }
  );

  const data = await openAIResponse.json().catch(() => null);

  if (!openAIResponse.ok || !data?.value) {
    console.error("OSCAR Realtime session creation failed:", {
      status: openAIResponse.status,
      error: data?.error?.message,
    });

    const error = new Error("Unable to start OSCAR Voice.");
    error.statusCode = 502;
    throw error;
  }

  return {
    clientSecret: data.value,
    expiresAt: data.expires_at,
    model: data.session?.model ?? env.OPENAI_REALTIME_MODEL,
  };
}