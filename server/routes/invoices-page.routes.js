import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

router.get(
  "/invoices",
  requireAuth,
  ensureCsrfToken,
  (req, res) => {
    res.render("invoices/index", {
      title: "Invoices",
      user: req.session.user,
      csrfToken: req.session.csrfToken,
    });
  },
);

export default router;
