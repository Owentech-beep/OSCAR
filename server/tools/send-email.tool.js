import { tool } from "@openai/agents";
import { z } from "zod";
import Email from "../models/Email.js";
import { createConfirmation } from "../services/confirmation.service.js";
import { requireToolContext } from "./tool-context.js";

export const sendEmailTool = tool({
  name: "send_email",

  description:
    "Prepare a saved email draft for sending. Sending an email is a consequential action and always requires explicit user confirmation. This tool does not send the email itself.",

  parameters: z.object({
    emailId: z
      .string()
      .min(1)
      .describe("The MongoDB ID of the saved email draft."),
  }),

  async execute({ emailId }, runContext) {
    const context = requireToolContext(runContext);

    if (!context.success) {
      return context;
    }

    const email = await Email.findById(emailId).lean();

    if (!email) {
      return {
        success: false,
        error: "Email draft not found.",
      };
    }

    if (email.status !== "draft") {
      return {
        success: false,
        error: `Email cannot be sent because its current status is "${email.status}".`,
      };
    }

    const confirmation = createConfirmation({
      userId: context.userId,
      action: "send_email",
      description: `Send email to ${email.to} with subject "${email.subject}".`,
      payload: {
        emailId: email._id.toString(),
      },
    });

    return {
      success: true,
      requiresConfirmation: true,
      confirmation: {
        confirmationId: confirmation.confirmationId,
        action: confirmation.action,
        description: confirmation.description,
        expiresAt: confirmation.expiresAt,
      },
    };
  },
});