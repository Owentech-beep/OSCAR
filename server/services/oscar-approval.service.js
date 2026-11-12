import { getConfirmation, consumeConfirmation, cancelConfirmation } from "./confirmation.service.js";
import { executeConfirmedAction } from "./confirmed-action.service.js";
import { addMessage } from "./oscar-memory.service.js";
import { createOscarApprovalResolver } from "./oscar-approval-resolution.service.js";

export const resolveOscarApproval = createOscarApprovalResolver({
  getConfirmation, consumeConfirmation, cancelConfirmation,
  executeConfirmedAction, addMessage,
});
