import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import {
  getBusinessSettings,
  saveBusinessSettings,
} from "../services/settings.service.js";

const router = express.Router();

router.use("/settings", requireAuth, async (req, res, next) => {
  try {
    const account = await User.findById(req.session.user.id)
      .select("name email role active")
      .lean();

    if (!account?.active) {
      return res.status(403).send("An active account is required.");
    }

    res.locals.settingsAccount = account;
    res.locals.canManageSettings = ["owner", "admin"].includes(account.role);

    next();
  } catch (error) {
    next(error);
  }
});

function renderSettings(req, res, business, options = {}) {
  return res.status(options.status || 200).render("settings/index", {
    title: "Settings",
    csrfToken: req.session.csrfToken,
    business,
    account: res.locals.settingsAccount,
    canManageSettings: res.locals.canManageSettings,
    saved: options.saved || false,
    errorMessage: options.errorMessage || "",
    integrations: {
      aiConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
      emailConfigured: Boolean(
        env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim(),
      ),
    },
  });
}

router.get("/settings", async (req, res, next) => {
  try {
    const business = await getBusinessSettings();

    return renderSettings(req, res, business, {
      saved: req.query.saved === "1",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/settings/business", async (req, res, next) => {
  if (!res.locals.canManageSettings) {
    return res.status(403).send(
      "Only owners and admins can change business settings.",
    );
  }

  const fields = ["name", "email", "phone", "website", "address"];
  const input = {};

  for (const field of fields) {
    const value = req.body?.[field];
    input[field] = typeof value === "string" ? value.trim() : "";
  }

  try {
    await saveBusinessSettings(input, res.locals.settingsAccount._id);
    return res.redirect(303, "/settings?saved=1");
  } catch (error) {
    if (error.statusCode === 400) {
      return renderSettings(req, res, input, {
        status: 400,
        errorMessage: error.message,
      });
    }

    next(error);
  }
});

export default router;