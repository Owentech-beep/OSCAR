import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

router.get(
  "/clients",
  requireAuth,
  ensureCsrfToken,
  (req, res) => {
    res.render("clients/index", {
      title: "Clients",
      user: req.session.user,
      csrfToken: req.session.csrfToken,
    });
  }
);

export default router;