const ACTION_POLICIES = {
  // Read-only actions
  get_leads: {
    requiresConfirmation: false,
  },

  search_leads: {
    requiresConfirmation: false,
  },

  get_lead_analysis: {
    requiresConfirmation: false,
  },

  // AI analysis
  analyze_lead: {
    requiresConfirmation: false,
  },

  // Database writes
  create_lead: {
    requiresConfirmation: true,
  },

  update_lead: {
    requiresConfirmation: true,
  },

  generate_email: {
    requiresConfirmation: false,
  },

  create_email_draft: {
    requiresConfirmation: false,
  },

  schedule_email: {
    requiresConfirmation: true,
  },

  get_email_statistics: {
    requiresConfirmation: false,
  },

  analyze_website: {
    requiresConfirmation: false,
  },

  get_website_audit: {
    requiresConfirmation: false,
  },

  // Client writes
  create_client: {
    requiresConfirmation: true,
  },

  update_client: {
    requiresConfirmation: true,
  },

  //memory writes
  search_memory: {
    requiresConfirmation: false,
  },

  save_memory: {
    requiresConfirmation: false,
  },

  // Business / Analytics reads
  get_business_context: {
    requiresConfirmation: false,
  },

  get_business_metrics: {
    requiresConfirmation: false,
  },

  get_revenue: {
    requiresConfirmation: false,
  },

  generate_business_report: {
    requiresConfirmation: false,
  },

  // Client reads
  get_clients: {
    requiresConfirmation: false,
  },

  get_client: {
    requiresConfirmation: false,
  },

  // Project / Task reads
  get_projects: {
    requiresConfirmation: false,
  },

  get_tasks: {
    requiresConfirmation: false,
  },

  // Calendar reads
  get_calendar_events: {
    requiresConfirmation: false,
  },

  // Email actions
  send_email: {
    requiresConfirmation: true,
  },

  // Invoice writes
  create_invoice: {
    requiresConfirmation: true,
  },

  update_invoice: {
    requiresConfirmation: true,
  },

  mark_invoice_sent: {
    requiresConfirmation: true,
  },

  mark_invoice_paid: {
    requiresConfirmation: true,
  },

  cancel_invoice: {
    requiresConfirmation: true,
    destructive: true,
  },

  get_invoices: {
    requiresConfirmation: false,
  },

  // Project writes
  create_project: {
    requiresConfirmation: true,
  },

  update_project: {
    requiresConfirmation: true,
  },

  delete_project: {
    requiresConfirmation: true,
    destructive: true,
  },

  // Task writes
  create_task: {
    requiresConfirmation: true,
  },

  update_task: {
    requiresConfirmation: true,
  },

  delete_task: {
    requiresConfirmation: true,
    destructive: true,
  },

  // Calendar writes
  create_calendar_event: {
    requiresConfirmation: true,
  },

  update_calendar_event: {
    requiresConfirmation: true,
  },

  delete_calendar_event: {
    requiresConfirmation: true,
    destructive: true,
  },

  // Client destructive
  delete_client: {
    requiresConfirmation: true,
    destructive: true,
  },

  // Destructive
  delete_lead: {
    requiresConfirmation: true,
    destructive: true,
  },
};

export function getActionPolicy(action) {
  return (
    ACTION_POLICIES[action] ?? {
      requiresConfirmation: true,
      destructive: true,
    }
  );
}

export function requiresConfirmation(action) {
  return getActionPolicy(action).requiresConfirmation;
}

export function isDestructiveAction(action) {
  return getActionPolicy(action).destructive === true;
}
