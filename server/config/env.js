import "dotenv/config";
import { z } from "zod";

const blankToUndefined = (value) => {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  OPENAI_API_KEY: z.preprocess(blankToUndefined, z.string().optional()),

  RESEND_API_KEY: z.preprocess(blankToUndefined, z.string().optional()),

  RESEND_FROM_EMAIL: z.preprocess(
    blankToUndefined,
    z.string().email().optional(),
  ),
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-realtime"),
  OPENAI_REALTIME_VOICE: z.string().default("marin"),
  OPENAI_REALTIME_SESSION_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(600)
    .default(600),
  MCP_PORT: z.coerce.number().int().positive().default(4000),
  MCP_AUTH_TOKEN: z
    .string()
    .min(32, "MCP_AUTH_TOKEN must be at least 32 characters"),
  MCP_AUTH_USER_ID: z.string().min(1, "MCP_AUTH_USER_ID is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
