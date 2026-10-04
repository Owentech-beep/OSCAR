import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ensureCsrfToken } from "../middleware/csrf.js";

const router = express.Router();

router.get("/tasks", requireAuth, ensureCsrfToken, (req, res) => {
  res.render("tasks/index", {
    title: "Tasks",
    user: req.session.user,
    csrfToken: req.session.csrfToken,
  });
});

export default router;