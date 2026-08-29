import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { ClientForm } from "@/components/ClientForm";
import { listClients } from "@/db/clients";
import { getSettings } from "@/db/settings";
import { createFullInvoice } from "@/db/full-invoice";
import { invoiceSubtotal, invoiceTax, type InvoiceStatus } from "@/types/invoice";
import type { Client } from "@/types/client";
import type { Settings } from "@/types/settings";
import { money } from "@/utils/format";

const ADD_CLIENT = "__add_client__";

interface DraftItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

const emptyItem = (): DraftItem => ({
  id: uuid(),
  description: "",
  quantity: 1,
  rate: 0,
});

const toISODate = (date: Date | undefined) =>
  date ? format(date, "yyyy-MM-dd") : "";

export function InvoiceForm() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientFormOpen, setClientFormOpen] = useState(false);

  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 14));
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const [errors, setErrors] = useState<{ client?: string; items?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setTaxRate(s.taxRate);
      setNumber(`${(s.invoicePrefix || "INV").trim()}-${String(s.nextInvoiceNumber).padStart(4, "0")}`);
    });
    listClients().then(setClients);
  }, []);

  const currency = settings?.defaultCurrency ?? "USD";

  const subtotal = useMemo(
    () => invoiceSubtotal(items.map((i) => ({ ...i, invoiceId: "", amount: i.quantity * i.rate }))),
    [items],
  );
  const taxAmount = useMemo(() => invoiceTax(subtotal, taxRate), [subtotal, taxRate]);
  const total = subtotal + taxAmount;

  const patchItem = (id: string, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  function onClientChange(value: string) {
    if (value === ADD_CLIENT) {
      setClientFormOpen(true);
      return;
    }
    setClientId(value);
    setErrors((e) => ({ ...e, client: undefined }));
  }

  // After an inline client is created, refresh the list and select the newest one.
  async function handleClientSaved() {
    const list = await listClients();
    setClients(list);
    if (list.length > 0) {
      setClientId(list[0].id);
      setErrors((e) => ({ ...e, client: undefined }));
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!clientId) next.client = "Select a client for this invoice.";
    const hasLineItem = items.some((i) => i.description.trim() && i.quantity > 0);
    if (!hasLineItem) next.items = "Add at least one line item with a description.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(status: InvoiceStatus) {
    if (!settings) return;
    if (!validate()) {
      toast.error("Check the invoice", { description: "Some required fields are missing." });
      return;
    }
    setSaving(true);
    try {
      const lineItems = items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          quantity: i.quantity,
          rate: i.rate,
          amount: i.quantity * i.rate,
        }));

      const invoiceId = await createFullInvoice({
        invoice: {
          invoiceNumber: number.trim(),
          clientId,
          status,
          issueDate: toISODate(issueDate),
          dueDate: toISODate(dueDate),
          currency,
          taxRate,
          notes: notes.trim(),
        },
        items: lineItems,
      });

      toast.success(status === "draft" ? "Draft saved" : "Invoice finalized", {
        description: `${number.trim()} · ${money(total, currency)}`,
      });
      navigate({ to: "/invoices/$id", params: { id: invoiceId } });
    } catch {
      toast.error("Could not save invoice", { description: "Please try again." });
      setSaving(false);
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      {/* Meta */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="number">Invoice number</Label>
          <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client">
            Client <span className="text-destructive">*</span>
          </Label>
          <Select value={clientId} onValueChange={onClientChange}>
            <SelectTrigger id="client" aria-invalid={Boolean(errors.client)}>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              {clients.length > 0 && <SelectSeparator />}
              <SelectItem value={ADD_CLIENT}>
                <span className="flex items-center gap-2 text-primary">
                  <UserPlus className="h-4 w-4" />
                  Add new client
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.client ? (
            <p className="text-xs text-destructive">{errors.client}</p>
          ) : (
            selectedClient?.email && (
              <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
            )
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue">Issue date</Label>
          <DatePicker id="issue" value={issueDate} onChange={setIssueDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due">Due date</Label>
          <DatePicker id="due" value={dueDate} onChange={setDueDate} />
        </div>
      </section>

      {/* Line items */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Line items</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-paper">
          <div className="grid grid-cols-[1fr_4.5rem_6rem_6rem_2.5rem] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
            <span className="sr-only">Remove</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_4.5rem_6rem_6rem_2.5rem] items-center gap-2 px-3 py-2"
              >
                <Input
                  aria-label="Description"
                  value={item.description}
                  onChange={(e) => patchItem(item.id, { description: e.target.value })}
                  placeholder="Design sprint"
                />
                <Input
                  aria-label="Quantity"
                  type="number"
                  min={0}
                  step="0.5"
                  className="text-right"
                  value={item.quantity}
                  onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) })}
                />
                <Input
                  aria-label="Rate"
                  type="number"
                  min={0}
                  step="0.01"
                  className="text-right"
                  value={item.rate}
                  onChange={(e) => patchItem(item.id, { rate: Number(e.target.value) })}
                />
                <span className="text-right text-sm tabular-nums">
                  {money(item.quantity * item.rate, currency)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
      </section>

      {/* Totals */}
      <section className="flex flex-col items-end gap-3">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{money(subtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <Label htmlFor="tax" className="text-muted-foreground">
              Tax rate (%)
            </Label>
            <Input
              id="tax"
              type="number"
              min={0}
              step="0.01"
              className="h-8 w-24 text-right"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{money(taxAmount, currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="font-display text-lg">Total</span>
            <span className="font-display text-lg font-semibold tabular-nums">
              {money(total, currency)}
            </span>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-2">
        <Label htmlFor="notes">Notes / terms</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment via bank transfer within 14 days."
          rows={3}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => save("sent")} disabled={saving}>
          {saving ? "Saving…" : "Save & Finalize"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => save("draft")} disabled={saving}>
          Save as Draft
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/invoices" })}>
          Cancel
        </Button>
      </div>

      <ClientForm
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        onSaved={handleClientSaved}
      />
    </form>
  );
}
