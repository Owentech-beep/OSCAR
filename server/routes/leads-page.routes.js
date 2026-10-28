import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

router.get("/leads", requireAuth, ensureCsrfToken, (req, res) => {
  res.render("leads/index", {
    title: "Leads",
    user: req.session.user,
    csrfToken: req.session.csrfToken,
  });
});

router.get("/leads/:id/edit", requireAuth, ensureCsrfToken, (req, res) => {
  res.render("leads/edit", {
    title: "Edit Lead",
    leadId: req.params.id,
    user: req.session.user,
    csrfToken: req.session.csrfToken,
  });
});

router.get("/leads/:id", requireAuth, ensureCsrfToken, (req, res) => {
  res.render("leads/details", {
    title: "Lead Details",
    leadId: req.params.id,
    user: req.session.user,
    csrfToken: req.session.csrfToken,
  });
});

export default router;