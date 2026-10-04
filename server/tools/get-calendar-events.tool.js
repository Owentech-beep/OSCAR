import { tool } from "@openai/agents";
import { z } from "zod";

import { getMeetings } from "../services/meeting.service.js";
import { requireToolContext } from "./tool-context.js";

export const getCalendarEventsTool = tool({
  name: "get_calendar_events",

  description:
    "Retrieve real calendar meetings and events from OSCAR's business calendar. Use this when the user asks about meetings, appointments, upcoming events, or calendar schedules.",

  parameters: z.object({
    from: z.string().optional().describe("Start date/time in ISO format."),

    to: z.string().optional().describe("End date/time in ISO format."),

    status: z
      .enum(["Scheduled", "Completed", "Cancelled", "No Show"])
      .optional(),

    search: z
      .string()
      .optional()
      .describe("Search meeting titles, descriptions, or contact names."),

    limit: z.number().int().min(1).max(100).default(20),
  }),

  async execute(input, runContext) {
    const auth = requireToolContext(runContext);

    if (!auth.success) {
      return auth;
    }

    try {
      const result = await getMeetings({
        page: 1,
        limit: input.limit,
        search: input.search || "",
        status: input.status || "",
        from: input.from || "",
        to: input.to || "",
      });

      return {
        success: true,
        data: result.meetings.map((meeting) => ({
          id: meeting._id.toString(),
          title: meeting.title,
          description: meeting.description || "",
          client: meeting.client
            ? {
                id: meeting.client._id.toString(),
                companyName: meeting.client.companyName,
                contactName: meeting.client.contactName || "",
              }
            : null,
          project: meeting.project
            ? {
                id: meeting.project._id.toString(),
                name: meeting.project.name,
              }
            : null,
          contactName: meeting.contactName || "",
          contactEmail: meeting.contactEmail || "",
          location: meeting.location || "",
          meetingType: meeting.meetingType,
          status: meeting.status,
          startAt: meeting.startAt,
          endAt: meeting.endAt,
          notes: meeting.notes || "",
        })),
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("get_calendar_events tool error:", error);

      return {
        success: false,
        error: "Unable to retrieve calendar events.",
      };
    }
  },
});
