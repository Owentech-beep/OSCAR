import {
  requiresConfirmation,
  isDestructiveAction,
} from "../services/action-policy.service.js";

import { createConfirmation } from "../services/confirmation.service.js";

export function guardToolAction({
  action,
  userId,
  payload = {},
  description,
}) {
  if (!requiresConfirmation(action)) {
    return {
      allowed: true,
      requiresConfirmation: false,
    };
  }

  const confirmation = createConfirmation({
    userId,
    action,
    description,
    payload,
  });

  return {
    allowed: false,
    requiresConfirmation: true,
    destructive: isDestructiveAction(action),
    confirmation: {
      confirmationId: confirmation.confirmationId,
      action: confirmation.action,
      description: confirmation.description,
      expiresAt: confirmation.expiresAt,
    },
  };
}