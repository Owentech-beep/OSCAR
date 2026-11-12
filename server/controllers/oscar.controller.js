import { requireOscarChannel } from "../services/oscar-channel.service.js";
import { runOscar } from "../services/oscar.service.js";
import { createToolContext } from "../tools/tool-context.js";
import { resolveOscarApproval } from "../services/oscar-approval.service.js";
import { createOscarVoiceSession as createOscarVoiceSessionService } from "../services/oscar-voice.service.js";

export const chatWithOscar = async (req, res, next) => {
  try {
    const { message } = req.body ?? {};
    const channel = requireOscarChannel(req.body?.channel);

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required.",
      });
    }

    const context = {
      ...createToolContext(req),
      ...req.oscarPrincipal,
      channel,
    };

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
    const { httpStatus, ...result } = await resolveOscarApproval({
      confirmationId: req.body?.confirmationId,
      channel: req.body?.channel,
      context: { ...req.oscarPrincipal, req },
    });
    return res.status(httpStatus).json(result);
  } catch (error) {
    next(error);
  }
};

export const createOscarVoiceSession = async (req, res, next) => {
  try {
    const userId = req.oscarPrincipal?.userId;
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
