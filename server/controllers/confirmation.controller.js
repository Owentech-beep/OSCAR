import {
  getConfirmation,
  consumeConfirmation,
  cancelConfirmation,
} from "../services/confirmation.service.js";
import { executeConfirmedAction } from "../services/confirmed-action.service.js";

export const getConfirmationController = (req, res) => {
  const confirmation = getConfirmation(req.params.id);

  if (!confirmation || confirmation.userId !== req.session.user.id) {
    return res.status(404).json({
      success: false,
      error: "Confirmation not found or expired.",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      confirmationId: confirmation.confirmationId,
      action: confirmation.action,
      description: confirmation.description,
      expiresAt: confirmation.expiresAt,
    },
  });
};

export const confirmActionController = async (req, res, next) => {
  try {
    const confirmation = consumeConfirmation(
      req.params.id,
      req.session.user.id,
    );

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        error: "Confirmation not found, expired, or already used.",
      });
    }

    const result = await executeConfirmedAction(confirmation, req);

    return res.status(200).json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelActionController = (req, res) => {
  const cancelled = cancelConfirmation(req.params.id, req.session.user.id);

  if (!cancelled) {
    return res.status(404).json({
      success: false,
      error: "Confirmation not found or expired.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Action cancelled.",
  });
};
