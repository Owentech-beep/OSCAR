import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

router.get(
  "/projects",
  requireAuth,
  ensureCsrfToken,
  (req, res) => {
    res.render("projects/index", {
      title: "Projects",
      user: req.session.user,
      csrfToken: req.session.csrfToken,
    });
  }
);

export default router;