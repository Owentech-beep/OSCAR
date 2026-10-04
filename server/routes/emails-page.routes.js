import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/emails", requireAuth, (req, res) => {
  res.render("emails/index", {
    title: "Emails",
    user: req.session.user,
  });
});

export default router;