import crypto from "node:crypto";

const pendingConfirmations = new Map();

export function createConfirmation({
  userId,
  action,
  description,
  payload = {},
  expiresInMs = 5 * 60 * 1000,
}) {
  const confirmationId = crypto.randomUUID();

  const confirmation = {
    confirmationId,
    userId,
    action,
    description,
    payload,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiresInMs),
  };

  pendingConfirmations.set(confirmationId, confirmation);

  return confirmation;
}

export function getConfirmation(confirmationId) {
  const confirmation = pendingConfirmations.get(confirmationId);

  if (!confirmation) {
    return null;
  }

  if (new Date() > confirmation.expiresAt) {
    pendingConfirmations.delete(confirmationId);
    return null;
  }

  return confirmation;
}

export function consumeConfirmation(confirmationId, userId) {
  const confirmation = getConfirmation(confirmationId);

  if (!confirmation) {
    return null;
  }

  if (confirmation.userId !== userId) {
    return null;
  }

  pendingConfirmations.delete(confirmationId);

  return confirmation;
}

export function cancelConfirmation(confirmationId, userId) {
  const confirmation = getConfirmation(confirmationId);

  if (!confirmation || confirmation.userId !== userId) {
    return false;
  }

  pendingConfirmations.delete(confirmationId);

  return true;
}
