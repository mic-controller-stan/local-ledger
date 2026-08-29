import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient, updateClient } from "@/db/clients";
import type { Client } from "@/types/client";

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form edits this client; otherwise it creates a new one. */
  client?: Client | null;
  onSaved: () => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientForm({ open, onOpenChange, client, onSaved }: ClientFormProps) {
  const isEditing = Boolean(client);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // Sync form fields whenever the sheet opens or the target client changes.
  useEffect(() => {
    if (open) {
      setName(client?.name ?? "");
      setEmail(client?.email ?? "");
      setAddress(client?.address ?? "");
      setPhone(client?.phone ?? "");
      setErrors({});
    }
  }, [open, client]);

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!emailPattern.test(email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      email: email.trim(),
      address: address.trim(),
      phone: phone.trim(),
    };
    try {
      if (isEditing && client) {
        await updateClient(client.id, payload);
        toast.success("Client updated", { description: payload.name });
      } else {
        await createClient(payload);
        toast.success("Client added", { description: payload.name });
      }
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Something went wrong", {
        description: "Your client could not be saved. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl tracking-tight">
            {isEditing ? "Edit client" : "New client"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the contact details for this client."
              : "Add a client so you can bill them on invoices."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} noValidate className="mt-6 flex flex-1 flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="client-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Studio"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "client-name-error" : undefined}
            />
            {errors.name && (
              <p id="client-name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="billing@acme.co"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "client-email-error" : undefined}
            />
            {errors.email && (
              <p id="client-email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-address">Address</Label>
            <Textarea
              id="client-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Market St, Suite 4&#10;San Francisco, CA"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="mt-auto flex gap-2 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Add client"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
