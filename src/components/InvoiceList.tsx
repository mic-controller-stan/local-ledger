import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { deleteInvoice } from "@/db/invoices";
import { listFullInvoices, type FullInvoice } from "@/db/full-invoice";
import { invoiceGrandTotal } from "@/types/invoice";
import { money, shortDate } from "@/utils/format";
import { downloadInvoicePdf } from "@/utils/pdf";

export function InvoiceList() {
  const [invoices, setInvoices] = useState<FullInvoice[] | null>(null);

  const refresh = () => listFullInvoices().then(setInvoices);
  useEffect(() => {
    refresh();
  }, []);

  if (invoices === null) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Create your first invoice to get started."
        action={
          <Button asChild>
            <Link to="/invoices/new">New invoice</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-paper"
        >
          <Link
            to="/invoices/$id"
            params={{ id: invoice.id }}
            className="min-w-40 flex-1"
          >
            <p className="font-display text-lg hover:underline">
              {invoice.client?.name || "Untitled client"}
            </p>
            <p className="text-xs text-muted-foreground">
              {invoice.invoiceNumber} · issued {shortDate(invoice.issueDate)} · due{" "}
              {shortDate(invoice.dueDate)}
            </p>
          </Link>
          <p className="font-display text-lg">
            {money(invoiceGrandTotal(invoice.items, invoice.taxRate), invoice.currency || "USD")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => downloadInvoicePdf(invoice)}>
              PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await deleteInvoice(invoice.id);
                refresh();
              }}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
