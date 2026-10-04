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