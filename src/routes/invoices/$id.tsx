import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { getFullInvoice } from "@/db/full-invoice";
import { deleteInvoice, updateInvoice } from "@/db/invoices";
import { invoiceSubtotal, invoiceTax } from "@/types/invoice";
import type { InvoiceStatus } from "@/types/invoice";
import { money, shortDate } from "@/utils/format";
import { downloadInvoicePdf } from "@/utils/pdf";
import { useEffect, useState } from "react";
import type { FullInvoice } from "@/db/full-invoice";

export const Route = createFileRoute("/invoices/$id")({
  head: () => ({
    meta: [{ title: "Invoice — Local Ledger" }],
  }),
  component: InvoiceDetailPage,
});

const statuses: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

function InvoiceDetailPage() {
  const { id } = Route.useParams();

  return (
    <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <InvoiceDetail id={id} />
    </ClientOnly>
  );
}

function InvoiceDetail({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<FullInvoice | null | undefined>(undefined);

  const refresh = () => getFullInvoice(id).then(setInvoice);
  useEffect(() => {
    refresh();
  }, [id]);

  if (invoice === undefined) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  if (invoice === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <EmptyState
          title="Invoice not found"
          description="This invoice may have been deleted."
          action={
            <Button asChild>
              <Link to="/invoices">Back to invoices</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const subtotal = invoiceSubtotal(invoice.items);
  const taxAmount = invoiceTax(subtotal, invoice.taxRate);
  const total = subtotal + taxAmount;
  const currency = invoice.currency || "USD";

  async function changeStatus(status: InvoiceStatus) {
    await updateInvoice(id, { status });
    refresh();
  }

  async function remove() {
    await deleteInvoice(id);
    window.location.href = "/invoices";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/invoices" className="text-xs text-muted-foreground hover:text-foreground">
        ← All invoices
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {invoice.client?.name || "Untitled client"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.invoiceNumber} · issued {shortDate(invoice.issueDate)} · due{" "}
            {shortDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => downloadInvoicePdf(invoice)}>
            Download PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={remove}>
            Delete
          </Button>
        </div>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        {statuses.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={invoice.status === s ? "default" : "outline"}
            onClick={() => changeStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <section className="mb-8 rounded-lg border border-border bg-card p-6 shadow-paper">
        <h2 className="mb-4 font-display text-lg">Line items</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_5rem_7rem_7rem] gap-2 text-xs font-medium text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          {invoice.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_5rem_7rem_7rem] gap-2 text-sm"
            >
              <span>{item.description || "-"}</span>
              <span className="text-right">{item.quantity}</span>
              <span className="text-right">{money(item.rate, currency)}</span>
              <span className="text-right">{money(item.amount, currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <div className="w-full max-w-xs space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{money(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax ({invoice.taxRate || 0}%)</span>
              <span className="tabular-nums">{money(taxAmount, currency)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="font-display text-lg">Total</span>
              <span className="font-display text-2xl">{money(total, currency)}</span>
            </div>
          </div>
        </div>
      </section>

      {invoice.notes && (
        <section className="rounded-lg border border-border bg-card p-6 shadow-paper">
          <h2 className="mb-2 font-display text-lg">Notes</h2>
          <p className="text-sm text-muted-foreground">{invoice.notes}</p>
        </section>
      )}
    </div>
  );
}
