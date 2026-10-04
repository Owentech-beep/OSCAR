import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/leads", requireAuth, (req, res) => {
  res.render("leads/index", {
    title: "Leads"
  });
});

router.get("/leads/:id/edit", requireAuth, (req, res) => {
  res.render("leads/edit", {
    title: "Edit Lead",
    leadId: req.params.id,
  });
});

router.get("/leads/:id", requireAuth, (req, res) => {
  res.render("leads/details", {
    title: "Lead Details",
    leadId: req.params.id,
  });
});

export default router;