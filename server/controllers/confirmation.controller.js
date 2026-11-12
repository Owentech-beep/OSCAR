import { getConfirmation } from "../services/confirmation.service.js";
import { resolveOscarApproval } from "../services/oscar-approval.service.js";

export const getConfirmationController = (req, res) => {
  const confirmation = getConfirmation(req.params.id);
  if (!confirmation || confirmation.userId !== req.oscarPrincipal.userId) {
    return res.status(404).json({ success: false, error: "Confirmation not found or expired." });
  }
  return res.status(200).json({ success: true, data: {
    confirmationId: confirmation.confirmationId,
    action: confirmation.action,
    description: confirmation.description,
    expiresAt: confirmation.expiresAt,
  } });
};

async function resolve(req, res, next, mode) {
  try {
    const { httpStatus, ...result } = await resolveOscarApproval({
      confirmationId: req.params.id,
      channel: req.body?.channel,
      mode,
      context: { ...req.oscarPrincipal, req },
    });
    return res.status(httpStatus).json(result);
  } catch (error) { next(error); }
}
export const confirmActionController = (req, res, next) => resolve(req, res, next, "confirm");
export const cancelActionController = (req, res, next) => resolve(req, res, next, "cancel");
