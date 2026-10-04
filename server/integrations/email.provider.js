import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendEmail({ to, subject, body }) {
  if (!env.RESEND_API_KEY) {
    const error = new Error("Email provider is not configured.");

    error.statusCode = 503;
    throw error;
  }

  if (!env.RESEND_FROM_EMAIL) {
    const error = new Error("RESEND_FROM_EMAIL is not configured.");

    error.statusCode = 503;
    throw error;
  }

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [to],
    subject,
    text: body,
  });

  if (error) {
    const providerError = new Error(
      error.message || "Resend failed to send the email.",
    );

    providerError.statusCode = 502;
    throw providerError;
  }

  return {
    success: true,
    messageId: data?.id ?? null,
  };
}
