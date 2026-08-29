import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { ClientForm } from "@/components/ClientForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listClients, deleteClient } from "@/db/clients";
import type { Client } from "@/types/client";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [{ title: "Clients — Local Ledger" }],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ClientsContent />
      </ClientOnly>
    </div>
  );
}

function ClientsContent() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

  const refresh = () => listClients().then(setClients);
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const name = pendingDelete.name;
    try {
      await deleteClient(pendingDelete.id);
      toast.success("Client deleted", { description: name });
      refresh();
    } catch {
      toast.error("Could not delete client", { description: "Please try again." });
    } finally {
      setPendingDelete(null);
    }
  }

  const header = (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Clients</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your client contacts.</p>
      </div>
      {clients && clients.length > 0 && (
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add client
        </Button>
      )}
    </header>
  );

  if (clients === null) {
    return (
      <>
        {header}
        <p className="text-sm text-muted-foreground">Reading local database…</p>
      </>
    );
  }

  return (
    <>
      {header}

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add a client to start creating invoices for them."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add client
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
              aria-label="Search clients by name"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-paper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No clients match &ldquo;{query}&rdquo;.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-display text-base">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.phone || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${client.name}`}
                            onClick={() => openEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete ${client.name}`}
                            onClick={() => setPendingDelete(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        onSaved={refresh}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">{pendingDelete?.name}</span> from this
              device. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
