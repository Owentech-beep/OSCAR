import fs from "node:fs";
import { pipeline } from "node:stream/promises";

import { generateInvoicePdf } from "../services/invoice-pdf.service.js";

function createSampleInvoice(itemCount, invoiceNumber) {
  const items = Array.from({ length: itemCount }, (_, index) => {
    const quantity = 2;
    const unitPrice = 250 + index * 10;

    return {
      description:
        index % 3 === 0
          ? `Website development and AI automation services - Phase ${index + 1}. Includes system configuration, integrations, testing and technical documentation.`
          : `Professional development service ${index + 1}`,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  const taxRate = 15;
  const tax = Math.round(subtotal * taxRate) / 100;

  return {
    invoiceNumber,

    client: {
      companyName: "Demo Client Solutions",
      contactName: "John Smith",
      email: "john@example.com",
      phone: "+27 11 000 0000",
      location: "Johannesburg, Gauteng",
    },

    issueDate: new Date("2026-10-27"),
    dueDate: new Date("2026-11-27"),

    items,
    subtotal,
    taxRate,
    tax,
    total: subtotal + tax,

    currency: "ZAR",
    status: "Draft",

    notes:
      "This is a demonstration invoice generated for testing OSCAR. " +
      "Payment information and issuer details will be configured separately.",
  };
}

async function generatePreview(itemCount, filename) {
  const invoice = createSampleInvoice(itemCount, filename.replace(".pdf", ""));

  const pdfStream = generateInvoicePdf(invoice);

  await pipeline(
    pdfStream,
    fs.createWriteStream(filename),
  );

  console.log(`PDF generated successfully: ${filename}`);
}

async function main() {
  await generatePreview(2, "invoice-preview-short.pdf");
  await generatePreview(35, "invoice-preview-long.pdf");

  console.log("Invoice PDF preview tests completed.");
}

main().catch((error) => {
  console.error("PDF generation failed:", error);
  process.exitCode = 1;
});