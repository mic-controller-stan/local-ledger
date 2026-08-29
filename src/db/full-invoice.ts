import { v4 as uuid } from "uuid";
import { db } from "./db";
import { defaultSettings } from "./settings";
import { SETTINGS_ID } from "@/types/settings";
import type { Invoice } from "@/types/invoice";
import type { InvoiceItem } from "@/types/invoice-item";
import type { Client } from "@/types/client";

export interface FullInvoice extends Invoice {
  items: InvoiceItem[];
  client: Client | undefined;
}

export interface NewInvoiceInput {
  invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">;
  items: Array<Omit<InvoiceItem, "id" | "invoiceId">>;
}

/**
 * Persist an invoice, its line items, and the settings counter bump in a single
 * atomic Dexie transaction so a partial write can never leave orphaned data.
 * Returns the id of the newly created invoice.
 */
export async function createFullInvoice({ invoice, items }: NewInvoiceInput): Promise<string> {
  return db.transaction("rw", db.invoices, db.invoiceItems, db.settings, async () => {
    const now = new Date().toISOString();
    const invoiceId = uuid();

    await db.invoices.put({ ...invoice, id: invoiceId, createdAt: now, updatedAt: now });

    for (const item of items) {
      await db.invoiceItems.put({
        ...item,
        id: uuid(),
        invoiceId,
        amount: item.quantity * item.rate,
      });
    }

    const current = (await db.settings.get(SETTINGS_ID)) ?? defaultSettings;
    await db.settings.put({
      ...current,
      id: SETTINGS_ID,
      nextInvoiceNumber: current.nextInvoiceNumber + 1,
    });

    return invoiceId;
  });
}

export async function getFullInvoice(id: string): Promise<FullInvoice | undefined> {
  const invoice = await db.invoices.get(id);
  if (!invoice) return undefined;
  const items = await db.invoiceItems.where("invoiceId").equals(id).toArray();
  const client = await db.clients.get(invoice.clientId);
  return { ...invoice, items, client };
}

export async function listFullInvoices(): Promise<FullInvoice[]> {
  const invoices = await db.invoices.orderBy("createdAt").reverse().toArray();
  const items = await db.invoiceItems.toArray();
  const clients = await db.clients.toArray();
  return invoices.map((invoice) => ({
    ...invoice,
    items: items.filter((i) => i.invoiceId === invoice.id),
    client: clients.find((c) => c.id === invoice.clientId),
  }));
}
