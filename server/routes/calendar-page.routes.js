import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

router.get(
  "/calendar",
  requireAuth,
  ensureCsrfToken,
  (req, res) => {
    res.render("calendar/index", {
      title: "Calendar",
      user: req.session.user,
      csrfToken: req.session.csrfToken,
    });
  }
);

export default router;