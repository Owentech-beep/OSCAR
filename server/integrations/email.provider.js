import { Resend } from "resend";
import { env } from "../config/env.js";
import {
  isEmailConfigured as checkEmailConfiguration,
  assertEmailConfigured as assertEmailConfiguration,
} from "../services/email-readiness.service.js";

let resend;

export async function sendEmail({ to, subject, body }) {
  assertEmailConfigured();

  resend ??= new Resend(env.RESEND_API_KEY);

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

export function isEmailConfigured() {
  return checkEmailConfiguration(env);
}

export function assertEmailConfigured() {
  assertEmailConfiguration(env);
}
