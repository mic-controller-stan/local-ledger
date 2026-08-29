import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FullInvoice } from "@/db/full-invoice";
import { invoiceSubtotal, invoiceTax } from "@/types/invoice";
import { money, shortDate } from "./format";

export async function invoiceToPdfBlob(invoice: FullInvoice) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.11, 0.1);
  const soft = rgb(0.45, 0.43, 0.4);

  let y = 780;
  const text = (
    value: string,
    opts: { x?: number; size?: number; bold?: boolean; color?: typeof ink } = {},
  ) => {
    page.drawText(value, {
      x: opts.x ?? 50,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: opts.color ?? ink,
    });
  };

  text("INVOICE", { size: 24, bold: true });
  y -= 18;
  text(invoice.invoiceNumber, { size: 11, color: soft });

  y = 720;
  text("Billed to", { bold: true });
  y -= 15;
  text(invoice.client?.name ?? "-");
  y -= 13;
  text(invoice.client?.email ?? "", { color: soft });

  y = 720;
  text(`Issued: ${shortDate(invoice.issueDate)}`, { x: 400 });
  y -= 15;
  text(`Due: ${shortDate(invoice.dueDate)}`, { x: 400 });

  y = 650;
  text("Description", { bold: true });
  text("Qty", { x: 360, bold: true });
  text("Rate", { x: 420, bold: true });
  text("Amount", { x: 500, bold: true });
  y -= 8;
  page.drawLine({
    start: { x: 50, y },
    end: { x: 545, y },
    thickness: 0.7,
    color: soft,
  });

  const currency = invoice.currency || "USD";

  for (const item of invoice.items) {
    y -= 20;
    text(item.description || "-");
    text(String(item.quantity), { x: 360 });
    text(money(item.rate, currency), { x: 420 });
    text(money(item.amount, currency), { x: 500 });
  }

  const subtotal = invoiceSubtotal(invoice.items);
  const taxAmount = invoiceTax(subtotal, invoice.taxRate);

  y -= 24;
  text("Subtotal", { x: 420, color: soft });
  text(money(subtotal, currency), { x: 500 });
  y -= 16;
  text(`Tax (${invoice.taxRate || 0}%)`, { x: 420, color: soft });
  text(money(taxAmount, currency), { x: 500 });
  y -= 20;
  text("Total", { x: 420, bold: true, size: 12 });
  text(money(subtotal + taxAmount, currency), { x: 500, bold: true, size: 12 });

  if (invoice.notes) {
    y -= 50;
    text("Notes", { bold: true });
    y -= 15;
    text(invoice.notes, { color: soft });
  }

  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

export async function downloadInvoicePdf(invoice: FullInvoice) {
  const blob = await invoiceToPdfBlob(invoice);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
