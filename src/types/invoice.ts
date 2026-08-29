import type { InvoiceItem } from "./invoice-item";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  status: InvoiceStatus;
  issueDate: string; // ISO
  dueDate: string; // ISO
  currency: string;
  taxRate: number; // percentage, e.g. 8.5
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Sum of line items before tax. */
export const invoiceSubtotal = (items: InvoiceItem[]) =>
  items.reduce((sum, i) => sum + i.quantity * i.rate, 0);

/** Backwards-compatible alias for the pre-tax subtotal. */
export const invoiceTotal = invoiceSubtotal;

/** Tax amount for a given subtotal and rate (percentage). */
export const invoiceTax = (subtotal: number, taxRate: number) =>
  subtotal * ((taxRate || 0) / 100);

/** Grand total including tax. */
export const invoiceGrandTotal = (items: InvoiceItem[], taxRate: number) => {
  const subtotal = invoiceSubtotal(items);
  return subtotal + invoiceTax(subtotal, taxRate);
};
