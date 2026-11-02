import { createLead, updateLead, deleteLead } from "./lead.service.js";
import { createClient } from "./client.service.js";
import Email from "../models/Email.js";
import {
  sendEmail,
  assertEmailConfigured,
} from "../integrations/email.provider.js";
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
import { scheduleEmail } from "./email.service.js";
import {
  createInvoice,
  updateInvoice,
  markInvoiceSent,
  markInvoicePaid,
  cancelInvoice,
} from "./invoice.service.js";
import { assertCanPerformAction } from "./authorization.service.js";
import { User } from "../models/User.js";
import { executeConfirmedEmail } from "./confirmed-email.service.js";

async function recordAuditSafely(entry) {
  try {
    await writeAuditLog(entry);
    return true;
  } catch (auditError) {
    console.error("OSCAR audit logging failed:", {
      action: entry.action,
      resourceType: entry.resourceType,
      error: auditError.message,
    });
    return false;
  }
}

export async function executeConfirmedAction(confirmation, context = {}) {
  if (!confirmation || typeof confirmation.action !== "string") {
    const error = new Error("Invalid confirmation.");
    error.statusCode = 400;
    throw error;
  }

  const { action, payload = {} } = confirmation;

  // Support structured contexts and Express requests.
  const req = context.req ?? (context.session?.user ? context : undefined);

  const sessionUser = req?.session?.user;
  const userId = context.userId ?? sessionUser?.id;

  if (!userId) {
    const error = new Error(
      "An authenticated user is required to execute this action.",
    );

    error.statusCode = 401;
    throw error;
  }

  // Always check the current account status and role in MongoDB.
  const actor = await User.findById(userId).select("role active");

  if (!actor || !actor.active) {
    const error = new Error("The user account is missing or inactive.");

    error.statusCode = 401;
    throw error;
  }

  const role = actor.role;

  // Enforce current permissions at the execution boundary.
  assertCanPerformAction(actor, action);
  const resourceType = ["send_email", "schedule_email"].includes(action)
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
            : [
                  "create_invoice",
                  "update_invoice",
                  "mark_invoice_sent",
                  "mark_invoice_paid",
                  "cancel_invoice",
                ].includes(action)
              ? "Invoice"
              : "Lead";
  try {
    let result;

    switch (action) {
      case "send_email": {
        result = await executeConfirmedEmail(payload, {
          Email,
          sendEmail,
          markEmailAsSent,
          assertEmailConfigured,
        });
        break;
      }

      case "schedule_email": {
        const { emailId, scheduledAt } = payload;

        const scheduledEmail = await scheduleEmail(emailId, scheduledAt);

        result = {
          success: true,
          action,
          email: {
            id: scheduledEmail._id.toString(),
            to: scheduledEmail.to,
            subject: scheduledEmail.subject,
            status: scheduledEmail.status,
            scheduledAt: scheduledEmail.scheduledAt,
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

      case "create_invoice": {
        const invoice = await createInvoice({
          ...payload,
          createdBy: userId,
        });

        result = {
          success: true,
          action,
          invoice: {
            id: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            client: invoice.client,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            taxRate: invoice.taxRate,
            total: invoice.total,
            currency: invoice.currency,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
          },
        };

        break;
      }

      case "update_invoice": {
        const { invoiceId, updates } = payload;

        const invoice = await updateInvoice(invoiceId, updates);

        if (!invoice) {
          result = {
            success: false,
            action,
            error: "Invoice not found.",
          };
          break;
        }

        result = {
          success: true,
          action,
          invoice: {
            id: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            client: invoice.client,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            taxRate: invoice.taxRate,
            total: invoice.total,
            currency: invoice.currency,
            status: invoice.status,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
          },
        };

        break;
      }

      case "mark_invoice_sent": {
        const invoice = await markInvoiceSent(payload.invoiceId);

        result = {
          success: true,
          action,
          invoice: {
            id: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
          },
        };

        break;
      }

      case "mark_invoice_paid": {
        const invoice = await markInvoicePaid(payload.invoiceId);

        result = {
          success: true,
          action,
          invoice: {
            id: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            paidAt: invoice.paidAt,
          },
        };

        break;
      }

      case "cancel_invoice": {
        const invoice = await cancelInvoice(payload.invoiceId);

        result = {
          success: true,
          action,
          invoice: {
            id: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
          },
        };

        break;
      }

      default: {
        result = {
          success: false,
          error: `Unsupported confirmed action: ${action}`,
        };
      }
    }

    if (result?.success === false) {
      await recordAuditSafely({
        actorUser: userId,
        action: `confirmed_${action}_failed`,
        resourceType,
        resourceId: null,
        metadata: {
          role,
          success: false,
          confirmationId: confirmation.confirmationId,
          action,
          error: result.error ?? "The action did not succeed.",
        },
        req: req,
      });

      return result;
    }
    await recordAuditSafely({
      actorUser: userId,
      action: `confirmed_${action}`,
      resourceType,
      resourceId: ["send_email", "schedule_email"].includes(action)
        ? payload.emailId
        : [
              "create_calendar_event",
              "update_calendar_event",
              "delete_calendar_event",
            ].includes(action)
          ? result?.meeting?.id || payload.meetingId || null
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
                      : [
                            "create_invoice",
                            "update_invoice",
                            "mark_invoice_sent",
                            "mark_invoice_paid",
                            "cancel_invoice",
                          ].includes(action)
                        ? result?.invoice?.id || payload.invoiceId
                        : payload.leadId ||
                          result?.lead?.id ||
                          result?.deletedLead?.id,
      metadata: {
        role,
        success: result.success,
        confirmationId: confirmation.confirmationId,
        action,
      },
      req: context.req,
    });

    return result;
  } catch (error) {
    await recordAuditSafely({
      actorUser: userId,
      action: `confirmed_${action}_failed`,
      resourceType,
      resourceId: ["send_email", "schedule_email"].includes(action)
        ? payload.emailId
        : [
              "create_calendar_event",
              "update_calendar_event",
              "delete_calendar_event",
            ].includes(action)
          ? payload.meetingId || null
          : ["create_client", "update_client", "delete_client"].includes(action)
            ? payload.clientId
            : ["create_project", "update_project", "delete_project"].includes(
                  action,
                )
              ? payload.projectId
              : ["create_task", "update_task", "delete_task"].includes(action)
                ? payload.taskId
                : [
                      "create_invoice",
                      "update_invoice",
                      "mark_invoice_sent",
                      "mark_invoice_paid",
                      "cancel_invoice",
                    ].includes(action)
                  ? payload.invoiceId
                  : payload.leadId,
      metadata: {
        role,
        success: false,
        confirmationId: confirmation.confirmationId,
        action,
        error: error.message,
      },
      req: context.req,
    });

    throw error;
  }
}
