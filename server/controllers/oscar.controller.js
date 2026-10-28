import { runOscar } from "../services/oscar.service.js";
import { createToolContext } from "../tools/tool-context.js";
import { consumeConfirmation } from "../services/confirmation.service.js";
import { executeConfirmedAction } from "../services/confirmed-action.service.js";
import { createOscarVoiceSession as createOscarVoiceSessionService } from "../services/oscar-voice.service.js";

export const chatWithOscar = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required.",
      });
    }

    const context = createToolContext(req);

    const result = await runOscar(message.trim(), context);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmOscarAction = async (req, res, next) => {
  try {
    const { confirmationId } = req.body;

    if (!confirmationId || typeof confirmationId !== "string") {
      return res.status(400).json({
        success: false,
        error: "Confirmation ID is required.",
      });
    }

    const userId = req.session.user.id;

    const confirmation = consumeConfirmation(confirmationId, userId);

    if (!confirmation) {
      return res.status(404).json({
        success: false,
        error: "Confirmation not found, expired, or not authorized.",
      });
    }

    const result = await executeConfirmedAction(confirmation, {
      userId: req.session.user.id,
      role: req.session.user.role,
      active: req.session.user.active,
      req,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const createOscarVoiceSession = async (req, res, next) => {
  try {
    const userId = req.session?.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const data = await createOscarVoiceSessionService(userId);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};