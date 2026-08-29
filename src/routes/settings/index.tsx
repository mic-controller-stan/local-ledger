import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings, updateSettings } from "@/db/settings";
import { CURRENCY_OPTIONS, type Settings } from "@/types/settings";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [{ title: "Settings — Local Ledger" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure your business details and invoice defaults.
        </p>
      </header>

      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <SettingsForm />
      </ClientOnly>
    </div>
  );
}

const MAX_LOGO_BYTES = 1_000_000; // ~1MB before base64 encoding

function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (settings === null) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  const patch = (p: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...p } : s));

  function handleLogoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Unsupported file", { description: "Please choose an image file." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Image too large", { description: "Choose an image under 1 MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ businessLogo: String(reader.result) });
    reader.onerror = () =>
      toast.error("Could not read image", { description: "Please try a different file." });
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success("Settings saved", { description: "Your invoice defaults are up to date." });
    } catch {
      toast.error("Could not save settings", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-paper">
        <h2 className="font-display text-lg">Business details</h2>

        <div className="space-y-2">
          <Label htmlFor="business-name">Business name</Label>
          <Input
            id="business-name"
            value={settings.businessName}
            onChange={(e) => patch({ businessName: e.target.value })}
            placeholder="Your Studio LLC"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="business-address">Business address</Label>
          <Textarea
            id="business-address"
            value={settings.businessAddress}
            onChange={(e) => patch({ businessAddress: e.target.value })}
            placeholder="123 Main St, City, Country"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {settings.businessLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.businessLogo || "/placeholder.svg"}
                  alt="Business logo preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageUp className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  handleLogoFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImageUp className="h-4 w-4" />
                  {settings.businessLogo ? "Replace" : "Upload"}
                </Button>
                {settings.businessLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch({ businessLogo: "" })}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG or SVG, up to 1 MB.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-paper">
        <h2 className="font-display text-lg">Invoice defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Default currency</Label>
            <Select
              value={settings.defaultCurrency}
              onValueChange={(value) => patch({ defaultCurrency: value })}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-rate">Default tax rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min={0}
              step="0.01"
              value={settings.taxRate}
              onChange={(e) => patch({ taxRate: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix">Invoice number prefix</Label>
            <Input
              id="prefix"
              value={settings.invoicePrefix}
              onChange={(e) => patch({ invoicePrefix: e.target.value })}
              placeholder="INV"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next-number">Starting number</Label>
            <Input
              id="next-number"
              type="number"
              min={1}
              value={settings.nextInvoiceNumber}
              onChange={(e) => patch({ nextInvoiceNumber: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Next invoice will be numbered{" "}
          <span className="font-medium text-foreground">
            {(settings.invoicePrefix || "INV").trim()}-
            {String(settings.nextInvoiceNumber || 1).padStart(4, "0")}
          </span>
          .
        </p>
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
