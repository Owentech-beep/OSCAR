import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const createCalendarEventTool = tool({
  name: "create_calendar_event",

  description:
    "Prepare a new calendar meeting. This tool never creates the meeting immediately. It returns a confirmation request that must be approved before the meeting is created.",

  parameters: z.object({
    title: z.string().min(1).max(200),

    description: z.string().max(5000).optional(),

    client: z.string().optional(),

    project: z.string().optional(),

    contactName: z.string().max(200).optional(),

    contactEmail: z.string().email().optional(),

    location: z.string().max(500).optional(),

    meetingType: z
      .enum([
        "Discovery",
        "Consultation",
        "Follow-up",
        "Client Meeting",
        "Internal",
        "Other",
      ])
      .default("Other"),

    status: z
      .enum(["Scheduled", "Completed", "Cancelled", "No Show"])
      .default("Scheduled"),

    startAt: z.string().min(1),

    endAt: z.string().min(1),

    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    const start = new Date(input.startAt);
    const end = new Date(input.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return {
        success: false,
        error: "Invalid meeting date or time.",
      };
    }

    if (end <= start) {
      return {
        success: false,
        error: "Meeting end time must be after the start time.",
      };
    }

    const confirmation = createConfirmation({
      action: "create_calendar_event",

      userId: auth.userId,

      payload: {
        title: input.title,
        description: input.description || "",
        client: input.client || undefined,
        project: input.project || undefined,
        contactName: input.contactName || "",
        contactEmail: input.contactEmail || "",
        location: input.location || "",
        meetingType: input.meetingType,
        status: input.status,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        notes: input.notes || "",
        createdBy: auth.userId,
      },
    });

    return {
      success: true,

      requiresConfirmation: true,

      confirmation: {
        id: confirmation.confirmationId,
        action: "create_calendar_event",
        message: "Please confirm creation of this calendar meeting.",
        details: {
          title: input.title,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          meetingType: input.meetingType,
          location: input.location || "",
          contactName: input.contactName || "",
        },
        expiresAt: confirmation.expiresAt,
      },
    };
  },
});
