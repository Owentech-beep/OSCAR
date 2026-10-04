import { analyzeLeadTool } from "./analyze-lead.tool.js";
import { getLeadAnalysisTool } from "./get-lead-analysis.tool.js";
import { getLeadsTool } from "./get-leads.tool.js";
import { searchLeadsTool } from "./search-leads.tool.js";
import { createLeadTool } from "./create-lead.tool.js";
import { updateLeadTool } from "./update-lead.tool.js";
import { deleteLeadTool } from "./delete-lead.tool.js";
import { getBusinessMetricsTool } from "./get-business-metrics.tool.js";
import { getBusinessContextTool } from "./get-business-context.tool.js";
import { analyzeWebsiteTool } from "./analyze-website.tool.js";
import { getWebsiteAuditTool } from "./get-website-audit.tool.js";
import { generateEmailTool } from "./generate-email.tool.js";
import { sendEmailTool } from "./send-email.tool.js";
import { getCalendarEventsTool } from "./get-calendar-events.tool.js";
import { createCalendarEventTool } from "./create-calendar-event.tool.js";
import { updateCalendarEventTool } from "./update-calendar-event.tool.js";
import { deleteCalendarEventTool } from "./delete-calendar-event.tool.js";
import { getClientsTool } from "./get-clients.tool.js";
import { getProjectsTool } from "./get-projects.tool.js";
import { getTasksTool } from "./get-tasks.tool.js";
import { createClientTool } from "./create-client.tool.js";
import { updateClientTool } from "./update-client.tool.js";
import { deleteClientTool } from "./delete-client.tool.js";
import { createProjectTool } from "./create-project.tool.js";
import { updateProjectTool } from "./update-project.tool.js";
import { deleteProjectTool } from "./delete-project.tool.js";
import { createTaskTool } from "./create-task.tool.js";
import { updateTaskTool } from "./update-task.tool.js";
import { deleteTaskTool } from "./delete-task.tool.js";
import { getRevenueTool } from "./get-revenue.tool.js";
import { generateBusinessReportTool } from "./generate-business-report.tool.js";

export const oscarTools = [
  analyzeLeadTool,
  getLeadAnalysisTool,
  getLeadsTool,
  searchLeadsTool,
  getBusinessMetricsTool,
  getBusinessContextTool,
  analyzeWebsiteTool,
  getWebsiteAuditTool,
  generateEmailTool,
  sendEmailTool,
  createLeadTool,
  updateLeadTool,
  deleteLeadTool,
  
  getCalendarEventsTool,
  createCalendarEventTool,
  updateCalendarEventTool,
  deleteCalendarEventTool,
  getClientsTool,
  getProjectsTool,
  getTasksTool,
  updateClientTool,
  deleteClientTool,
  createProjectTool,
  updateProjectTool,
  deleteProjectTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  getRevenueTool,
  getRevenueTool,
  generateBusinessReportTool,
];