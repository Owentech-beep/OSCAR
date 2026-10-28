const ROLE_PERMISSIONS = {
  owner: new Set(["*"]),

  admin: new Set([
    "read",
    "manage_leads",
    "manage_clients",
    "manage_projects",
    "manage_tasks",
    "manage_calendar",
    "manage_email",
    "view_analytics",
    "manage_memory",
    "manage_invoices",
  ]),

  staff: new Set(["read", "manage_leads", "manage_tasks", "manage_calendar"]),
};

const ACTION_PERMISSIONS = {
  // Read-only
  get_business_context: "read",
  get_business_metrics: "view_analytics",
  get_revenue: "view_analytics",
  generate_business_report: "view_analytics",
  get_clients: "read",
  get_client: "read",
  get_leads: "read",
  get_projects: "read",
  get_tasks: "read",
  get_calendar_events: "read",
  get_email_statistics: "read",
  get_website_audit: "read",
  search_memory: "read",
  get_invoices: "read",

  // Leads
  create_lead: "manage_leads",
  update_lead: "manage_leads",
  delete_lead: "manage_leads",
  analyze_lead: "manage_leads",
  search_leads: "read",
  get_lead_analysis: "read",
  analyze_website: "manage_leads",

  // Clients
  create_client: "manage_clients",
  update_client: "manage_clients",
  delete_client: "manage_clients",

  // Projects
  create_project: "manage_projects",
  update_project: "manage_projects",
  delete_project: "manage_projects",

  // Tasks
  create_task: "manage_tasks",
  update_task: "manage_tasks",
  delete_task: "manage_tasks",

  //memory
  save_memory: "manage_memory",

  // Calendar
  create_calendar_event: "manage_calendar",
  update_calendar_event: "manage_calendar",
  delete_calendar_event: "manage_calendar",

  // Email
  send_email: "manage_email",
  schedule_email: "manage_email",
  generate_email: "manage_email",
  create_email_draft: "manage_email",

  // Invoices
  create_invoice: "manage_invoices",
  update_invoice: "manage_invoices",
  mark_invoice_sent: "manage_invoices",
  mark_invoice_paid: "manage_invoices",
  cancel_invoice: "manage_invoices",
};

export function getRequiredPermission(action) {
  return ACTION_PERMISSIONS[action] ?? null;
}

export function canPerformAction(user, action) {
  if (!user?.active) {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[user.role];

  if (!rolePermissions) {
    return false;
  }

  if (rolePermissions.has("*")) {
    return true;
  }

  const requiredPermission = getRequiredPermission(action);

  if (!requiredPermission) {
    return false;
  }

  return rolePermissions.has(requiredPermission);
}

export function assertCanPerformAction(user, action) {
  if (!canPerformAction(user, action)) {
    const error = new Error(
      `User is not authorized to perform action: ${action}`,
    );

    error.statusCode = 403;
    error.code = "ACTION_NOT_AUTHORIZED";

    throw error;
  }
}
