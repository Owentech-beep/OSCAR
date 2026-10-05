import { createLead, updateLead, deleteLead } from "./lead.service.js";
import { createClient } from "./client.service.js";
import Email from "../models/Email.js";
import { sendEmail } from "../integrations/email.provider.js";
import { markEmailAsSent } from "./email-send.service.js";
import { writeAuditLog } from "./audit.service.js";
import {
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from "./meeting.service.js";
import { updateClient } from "./client.service.js";
import { deleteClient } from "./client.service.js";
import { createProject } from "./project.service.js";
import { updateProject } from "./project.service.js";
import { deleteProject } from "./project.service.js";
import { createTask } from "./task.service.js";
import { updateTask } from "./task.service.js";
import { deleteTask } from "./task.service.js";

export async function executeConfirmedAction(confirmation, context) {
  const { action, payload } = confirmation;

  const userId = context.userId;
  const role = context.role;
  const resourceType =
    action === "send_email"
      ? "Email"
      : [
            "create_calendar_event",
            "update_calendar_event",
            "delete_calendar_event",
          ].includes(action)
        ? "Meeting"
        : ["create_client", "update_client", "delete_client"].includes(action)
          ? "Client"
          : ["create_project", "update_project", "delete_project"].includes(
                action,
              )
            ? "Project"
            : ["create_task", "update_task", "delete_task"].includes(action)
              ? "Task"
              : "Lead";
  try {
    let result;

    switch (action) {
      case "send_email": {
        const { emailId } = payload;

        const email = await Email.findById(emailId);

        if (!email) {
          result = {
            success: false,
            action,
            error: "Email draft not found.",
          };
          break;
        }

        if (email.status !== "draft") {
          result = {
            success: false,
            action,
            error: `Email cannot be sent because its status is "${email.status}".`,
          };
          break;
        }

        const providerResult = await sendEmail({
          to: email.to,
          subject: email.subject,
          body: email.body,
        });

        const sentEmail = await markEmailAsSent(
          emailId,
          providerResult.messageId,
        );

        result = {
          success: true,
          action,
          email: {
            id: sentEmail._id.toString(),
            to: sentEmail.to,
            subject: sentEmail.subject,
            status: sentEmail.status,
            sentAt: sentEmail.sentAt,
            providerMessageId: sentEmail.providerMessageId,
          },
        };

        break;
      }
      case "create_lead": {
        const lead = await createLead(payload);

        result = {
          success: true,
          action,
          lead: {
            id: lead._id.toString(),
            companyName: lead.companyName,
            contactName: lead.contactName,
            email: lead.email,
            status: lead.status,
            leadScore: lead.leadScore,
          },
        };

        break;
      }

      case "update_lead": {
        const { leadId, ...updates } = payload;

        const lead = await updateLead(leadId, updates);

        if (!lead) {
          result = {
            success: false,
            action,
            error: "Lead not found.",
          };

          break;
        }

        result = {
          success: true,
          action,
          lead: {
            id: lead._id.toString(),
            companyName: lead.companyName,
            contactName: lead.contactName,
            email: lead.email,
            status: lead.status,
            leadScore: lead.leadScore,
          },
        };

        break;
      }

      case "delete_lead": {
        const lead = await deleteLead(payload.leadId);

        if (!lead) {
          result = {
            success: false,
            action,
            error: "Lead not found.",
          };

          break;
        }

        result = {
          success: true,
          action,
          deletedLead: {
            id: lead._id.toString(),
            companyName: lead.companyName,
            contactName: lead.contactName,
            email: lead.email,
          },
        };

        break;
      }

      case "create_calendar_event": {
        const meeting = await createMeeting({
          ...payload,
          createdBy: userId,
        });

        result = {
          success: true,
          action,
          meeting: {
            id: meeting._id.toString(),
            title: meeting.title,
            startAt: meeting.startAt,
            endAt: meeting.endAt,
            status: meeting.status,
            meetingType: meeting.meetingType,
          },
        };

        break;
      }

      case "update_calendar_event": {
        const { meetingId, updates } = payload;

        const meeting = await updateMeeting(meetingId, updates);

        if (!meeting) {
          result = {
            success: false,
            action,
            error: "Meeting not found.",
          };

          break;
        }

        result = {
          success: true,
          action,
          meeting: {
            id: meeting._id.toString(),
            title: meeting.title,
            startAt: meeting.startAt,
            endAt: meeting.endAt,
            status: meeting.status,
            meetingType: meeting.meetingType,
          },
        };

        break;
      }

      case "delete_calendar_event": {
        const meeting = await deleteMeeting(payload.meetingId);

        if (!meeting) {
          result = {
            success: false,
            action,
            error: "Meeting not found.",
          };

          break;
        }

        result = {
          success: true,
          action,
          deletedMeeting: {
            id: meeting._id.toString(),
            title: meeting.title,
            startAt: meeting.startAt,
            endAt: meeting.endAt,
          },
        };

        break;
      }

      case "create_client": {
        const client = await createClient(payload);

        result = {
          success: true,
          action,
          client: {
            id: client._id.toString(),
            companyName: client.companyName,
            contactName: client.contactName,
            email: client.email,
            phone: client.phone,
            status: client.status,
          },
        };

        break;
      }

      case "update_client": {
        result = await updateClient(payload.clientId, payload.updates);
        break;
      }

      case "delete_client": {
        result = await deleteClient(payload.clientId);

        break;
      }

      case "create_project": {
        result = await createProject(payload);

        break;
      }

      case "update_project": {
        result = await updateProject(payload.projectId, payload.updates);

        break;
      }

      case "delete_project": {
        result = await deleteProject(payload.projectId);

        break;
      }

      case "create_task": {
        result = await createTask(payload);

        break;
      }

      case "update_task": {
        result = await updateTask(payload.taskId, payload.updates);

        break;
      }

      case "delete_task": {
        result = await deleteTask(payload.taskId);

        break;
      }

      default: {
        result = {
          success: false,
          error: `Unsupported confirmed action: ${action}`,
        };
      }
    }

    await writeAuditLog({
      actorUser: userId,
      action: `confirmed_${action}`,
      resourceType,
      resourceId:
        action === "send_email"
          ? payload.emailId
          : action === "create_calendar_event"
            ? result?.meeting?.id
            : action === "update_calendar_event"
              ? result?.meeting?.id || payload.meetingId
              : action === "delete_calendar_event"
                ? result?.deletedMeeting?.id || payload.meetingId
                : ["create_client", "update_client"].includes(action)
                  ? result?.client?.id || payload.clientId
                  : action === "delete_client"
                    ? result?.deletedClient?.id || payload.clientId
                    : ["create_project", "update_project"].includes(action)
                      ? result?.project?.id || payload.projectId
                      : action === "delete_project"
                        ? result?.deletedProject?.id || payload.projectId
                        : ["create_task", "update_task"].includes(action)
                          ? result?.task?.id || payload.taskId
                          : action === "delete_task"
                            ? result?.deletedTask?.id || payload.taskId
                            : payload.leadId ||
                              result?.lead?.id ||
                              result?.deletedLead?.id,
      metadata: {
        role,
        success: result.success,
        confirmationId: confirmation.confirmationId,
        action,
      },
      req:context.req,
    });

    return result;
  } catch (error) {
    await writeAuditLog({
      actorUser: userId,
      action: `confirmed_${action}_failed`,
      resourceType,
      resourceId:
        action === "send_email"
          ? payload.emailId
          : [
                "create_calendar_event",
                "update_calendar_event",
                "delete_calendar_event",
              ].includes(action)
            ? payload.meetingId || null
            : ["create_client", "update_client", "delete_client"].includes(
                  action,
                )
              ? payload.clientId
              : ["create_project", "update_project", "delete_project"].includes(
                    action,
                  )
                ? payload.projectId
                : ["create_task", "update_task","delete_task"].includes(action)
                  ? payload.taskId
                  : payload.leadId,
      metadata: {
        role,
        success: false,
        confirmationId: confirmation.confirmationId,
        action,
        error: error.message,
      },
      req:context.req,
    });

    throw error;
  }
}
