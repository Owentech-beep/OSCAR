import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const deleteCalendarEventTool = tool({
  name: "delete_calendar_event",

  description:
    "Prepare deletion of an existing calendar meeting. Never delete immediately. Always require explicit user confirmation.",

  parameters: z.object({
    meetingId: z.string().min(1),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const confirmation = createConfirmation({
      userId: auth.userId,

      action: "delete_calendar_event",

      description:
        "Please confirm deletion of this calendar meeting.",

      payload: {
        meetingId: input.meetingId,
      },
    });

    return {
      success: true,

      requiresConfirmation: true,

      confirmation: {
        id: confirmation.confirmationId,
        action: confirmation.action,
        message: confirmation.description,
        details: {
          meetingId: input.meetingId,
        },
        expiresAt: confirmation.expiresAt,
      },
    };
  },
});