import PDFDocument from "pdfkit";
import { PassThrough } from "node:stream";

const DEFAULT_BRAND = {
  name: process.env.BUSINESS_NAME || "OwenTech",
  email: process.env.BUSINESS_EMAIL || "",
  phone: process.env.BUSINESS_PHONE || "",
  website: process.env.BUSINESS_WEBSITE || "",
  address: process.env.BUSINESS_ADDRESS || "",
};

function formatCurrency(amount, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function addLabelValue(doc, label, value, x, y, width = 180) {
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#64748b")
    .text(label.toUpperCase(), x, y, { width });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#0f172a")
    .text(String(value || "—"), x, y + 15, { width });
}

function ensurePageSpace(doc, requiredHeight = 60) {
  if (doc.y + requiredHeight > doc.page.height - 70) {
    doc.addPage();
  }
}

export function generateInvoicePdf(invoice, business = DEFAULT_BRAND) {
  const BRAND = business;
  if (!invoice) {
    throw new Error("An invoice is required to generate a PDF.");
  }

  const stream = new PassThrough();
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    bufferPages: true,
    info: {
      Title: `Invoice ${invoice.invoiceNumber}`,
      Author: BRAND.name,
      Subject: "Invoice",
    },
  });

  doc.on("error", (error) => {
    stream.destroy(error);
  });

  doc.pipe(stream);

  const left = 50;
  const right = doc.page.width - 50;
  const contentWidth = right - left;

  // Header
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#12316b")
    .text(BRAND.name, left, 50, { width: 280 });

  doc
    .font("Helvetica-Bold")
    .fontSize(25)
    .fillColor("#0f172a")
    .text("INVOICE", 350, 50, {
      width: contentWidth - 300,
      align: "right",
    });

  doc
    .moveTo(left, 100)
    .lineTo(right, 100)
    .lineWidth(1.5)
    .strokeColor("#2563eb")
    .stroke();

  let businessY = 115;

  for (const value of [
    BRAND.address,
    BRAND.email,
    BRAND.phone,
    BRAND.website,
  ]) {
    if (value) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#475569")
        .text(value, left, businessY, { width: 260 });

      businessY = doc.y + 4;
    }
  }

  // Invoice metadata
  addLabelValue(doc, "Invoice Number", invoice.invoiceNumber, 350, 120, 195);

  addLabelValue(doc, "Status", invoice.status, 350, 170, 195);

  addLabelValue(doc, "Issue Date", formatDate(invoice.issueDate), 350, 220);

  addLabelValue(doc, "Due Date", formatDate(invoice.dueDate), 450, 220);

  // Client details
  const client = invoice.client || {};

  const clientY = Math.max(businessY + 25, 275);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#12316b")
    .text("BILL TO", left, clientY);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text(
      client.companyName || client.contactName || "Client",
      left,
      clientY + 20,
      {
        width: 260,
      },
    );

  let clientDetailsY = doc.y + 5;

  for (const value of [
    client.contactName,
    client.email,
    client.phone,
    client.location,
  ]) {
    if (value) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#475569")
        .text(value, left, clientDetailsY, { width: 260 });

      clientDetailsY = doc.y + 3;
    }
  }

  // Items table
  const tableTop = Math.max(clientDetailsY + 25, 365);
  const descriptionX = left;
  const quantityX = 335;
  const unitPriceX = 390;
  const amountX = 475;

  function drawTableHeader(y) {
    doc.rect(left, y, contentWidth, 28).fill("#12316b");

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#ffffff")
      .text("DESCRIPTION", descriptionX + 8, y + 9, { width: 270 })
      .text("QTY", quantityX, y + 9, { width: 40, align: "right" })
      .text("UNIT PRICE", unitPriceX, y + 9, { width: 75, align: "right" })
      .text("AMOUNT", amountX, y + 9, { width: 70, align: "right" });

    return y + 28;
  }

  let rowY = drawTableHeader(tableTop);

  for (const item of invoice.items || []) {
    const description = String(item.description || "Item");
    const descriptionHeight = doc
      .font("Helvetica")
      .fontSize(9)
      .heightOfString(description, { width: 255 });

    const rowHeight = Math.max(28, descriptionHeight + 14);

    const pageBottom = doc.page.height - 70;

    if (rowY + rowHeight > pageBottom) {
      doc.addPage();
      rowY = drawTableHeader(50);
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#0f172a")
      .text(description, descriptionX + 8, rowY + 8, {
        width: 255,
      })
      .text(String(item.quantity), quantityX, rowY + 8, {
        width: 40,
        align: "right",
      })
      .text(
        formatCurrency(item.unitPrice, invoice.currency),
        unitPriceX,
        rowY + 8,
        {
          width: 75,
          align: "right",
        },
      )
      .text(formatCurrency(item.amount, invoice.currency), amountX, rowY + 8, {
        width: 70,
        align: "right",
      });

    rowY += rowHeight;

    doc
      .moveTo(left, rowY)
      .lineTo(right, rowY)
      .lineWidth(0.5)
      .strokeColor("#e2e8f0")
      .stroke();

    rowY += 2;
  }

  // Totals
  if (rowY + 115 > doc.page.height - 70) {
    doc.addPage();
    rowY = 70;
  }

  const totalsLabelX = 340;
  const totalsValueX = 445;
  const totalsWidth = 100;

  function drawTotal(label, amount, y, emphasize = false) {
    doc
      .font(emphasize ? "Helvetica-Bold" : "Helvetica")
      .fontSize(emphasize ? 12 : 10)
      .fillColor(emphasize ? "#12316b" : "#475569")
      .text(label, totalsLabelX, y, { width: 100 });

    doc
      .font(emphasize ? "Helvetica-Bold" : "Helvetica")
      .fontSize(emphasize ? 12 : 10)
      .fillColor("#0f172a")
      .text(formatCurrency(amount, invoice.currency), totalsValueX, y, {
        width: totalsWidth,
        align: "right",
      });
  }

  drawTotal("Subtotal", invoice.subtotal, rowY + 12);
  drawTotal(`Tax (${Number(invoice.taxRate) || 0}%)`, invoice.tax, rowY + 34);

  doc
    .moveTo(totalsLabelX, rowY + 58)
    .lineTo(right, rowY + 58)
    .lineWidth(1)
    .strokeColor("#cbd5e1")
    .stroke();

  drawTotal("TOTAL", invoice.total, rowY + 70, true);

  // Notes
  if (invoice.notes) {
    let notesY = rowY + 115;

    if (notesY + 70 > doc.page.height - 70) {
      doc.addPage();
      notesY = doc.page.margins.top;
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#12316b")
      .text("NOTES", left, notesY);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#475569")
      .text(invoice.notes, left, notesY + 18, {
        width: contentWidth,
      });
  }

  // Footer on every page
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index++) {
    doc.switchToPage(index);

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748b")
      .text(
        `${BRAND.name} · Invoice ${invoice.invoiceNumber}`,
        left,
        doc.page.height - 60,
        {
          width: contentWidth,
          align: "center",
          lineBreak: false,
        },
      );
  }

  doc.end();
  return stream;
}
