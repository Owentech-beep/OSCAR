import express from "express";

import {
  getInvoicesController,
  getInvoiceController,
  createInvoiceController,
  updateInvoiceController,
  markInvoiceSentController,
  markInvoicePaidController,
  cancelInvoiceController,
  getInvoiceSummaryController,
  downloadInvoicePdfController,
} from "../controllers/invoice.controller.js";
import { requireApiAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireApiAuth);

// Specific routes must come before parameterized routes.
router.get("/summary", getInvoiceSummaryController);
router.get("/", getInvoicesController);
router.get("/:id/pdf", downloadInvoicePdfController);
router.post("/", createInvoiceController);
router.patch("/:id", updateInvoiceController);

router.post("/:id/send", markInvoiceSentController);
router.post("/:id/pay", markInvoicePaidController);
router.post("/:id/cancel", cancelInvoiceController);

// Keep the catch-all invoice lookup last.
router.get("/:id", getInvoiceController);

export default router;
