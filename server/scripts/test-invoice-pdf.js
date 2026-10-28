import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { generateInvoicePdf } from "../services/invoice-pdf.service.js";

const invoice = {
  invoiceNumber: "INV-TEST-001",

  status: "Draft",

  issueDate: new Date("2026-10-25"),
  dueDate: new Date("2026-11-01"),

  currency: "ZAR",

  client: {
    companyName: "Demo Client (Pty) Ltd",
    contactName: "John Smith",
    email: "john@example.com",
    phone: "012 555 0100",
    location: "Pretoria, Gauteng",
  },

  items: [
    {
      description: "Business Website Development",
      quantity: 1,
      unitPrice: 3500,
      amount: 3500,
    },
    {
      description: "Website Hosting Configuration",
      quantity: 1,
      unitPrice: 500,
      amount: 500,
    },
    {
      description: "Website Maintenance",
      quantity: 2,
      unitPrice: 250,
      amount: 500,
    },
  ],

  subtotal: 4500,
  taxRate: 15,
  tax: 675,
  total: 5175,

  notes: "Thank you for choosing OwenTech. Payment details will be provided separately.",
};

async function main() {
  await mkdir("tmp", { recursive: true });

  const outputPath = "tmp/invoice-preview.pdf";

  await pipeline(
    generateInvoicePdf(invoice),
    createWriteStream(outputPath),
  );

  console.log(`Invoice PDF generated successfully: ${outputPath}`);
}

main().catch((error) => {
  console.error("Invoice PDF generation failed:", error);
  process.exitCode = 1;
});