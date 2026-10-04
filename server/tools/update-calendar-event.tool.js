import { tool } from "@openai/agents";
import { z } from "zod";

import { requireToolContext } from "./tool-context.js";
import { createConfirmation } from "../services/confirmation.service.js";

export const updateCalendarEventTool = tool({
  name: "update_calendar_event",

  description:
    "Prepare an update to an existing calendar meeting. Never modify the meeting immediately. Always return a confirmation request first.",

  parameters: z.object({
    meetingId: z.string().min(1),

    title: z.string().min(1).max(200).optional(),

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
      .optional(),

    status: z
      .enum([
        "Scheduled",
        "Completed",
        "Cancelled",
        "No Show",
      ])
      .optional(),

    startAt: z.string().optional(),

    endAt: z.string().optional(),

    notes: z.string().max(5000).optional(),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    if (!input.meetingId) {
      return {
        success: false,
        error: "Meeting ID is required.",
      };
    }

    const confirmation = createConfirmation({
      userId: auth.userId,

      action: "update_calendar_event",

      description:
        "Please confirm the requested calendar meeting update.",

      payload: {
        meetingId: input.meetingId,

        updates: {
          ...(input.title !== undefined && {
            title: input.title,
          }),

          ...(input.description !== undefined && {
            description: input.description,
          }),

          ...(input.client !== undefined && {
            client: input.client,
          }),

          ...(input.project !== undefined && {
            project: input.project,
          }),

          ...(input.contactName !== undefined && {
            contactName: input.contactName,
          }),

          ...(input.contactEmail !== undefined && {
            contactEmail: input.contactEmail,
          }),

          ...(input.location !== undefined && {
            location: input.location,
          }),

          ...(input.meetingType !== undefined && {
            meetingType: input.meetingType,
          }),

          ...(input.status !== undefined && {
            status: input.status,
          }),

          ...(input.startAt !== undefined && {
            startAt: input.startAt,
          }),

          ...(input.endAt !== undefined && {
            endAt: input.endAt,
          }),

          ...(input.notes !== undefined && {
            notes: input.notes,
          }),
        },
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
          changes: confirmation.payload.updates,
        },
        expiresAt: confirmation.expiresAt,
      },
    };
  },
});