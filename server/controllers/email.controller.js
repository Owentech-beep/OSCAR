import {
  getEmails,
  getEmailById,
  getLeadEmails,
} from "../services/email.service.js";

export async function getEmailsController(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const status = req.query.status || "";

    const result = await getEmails({
      page,
      limit,
      status,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getEmailController(req, res, next) {
  try {
    const email = await getEmailById(req.params.id);

    if (!email) {
      return res.status(404).json({
        success: false,
        error: "Email not found.",
      });
    }

    return res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLeadEmailsController(req, res, next) {
  try {
    const emails = await getLeadEmails(req.params.leadId);

    return res.json({
      success: true,
      data: emails,
    });
  } catch (error) {
    return next(error);
  }
}