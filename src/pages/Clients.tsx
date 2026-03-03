import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MoreHorizontal, Phone, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient, fetchClients, type ClientRecord, type ClientStatus } from "@/lib/crm-db";

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  tags: string;
  lastContactDate: string;
}

const emptyForm: ClientForm = {
  name: "",
  email: "",
  phone: "",
  status: "potencial",
  tags: "",
  lastContactDate: "",
};

const statusConfig = {
  ativo: "bg-success/10 text-success border-success/20",
  inativo: "bg-muted text-muted-foreground border-border",
  potencial: "bg-warning/10 text-warning border-warning/20",
};

const formatDateBR = (isoDate: string) => {
  if (!isoDate) return "-";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("pt-BR");
};

const Clients = () => {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await fetchClients();
        setClients(data);
      } catch (error) {
        toast.error("Nao foi possivel carregar clientes", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  const filtered = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.email.toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  const onCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    setSaving(true);
    try {
      const newClient = await createClient({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        lastContactDate: form.lastContactDate,
      });

      setClients((prev) => [newClient, ...prev]);
      setForm(emptyForm);
      setDialogOpen(false);
      toast.success("Cliente criado com sucesso");
    } catch (error) {
      toast.error("Falha ao criar cliente", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Cadastre um novo cliente no CRM.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nome"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClientStatus }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="potencial">Potencial</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="E-mail"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Telefone"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="Tags (separadas por virgula)"
                className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="date"
                value={form.lastContactDate}
                onChange={(event) => setForm((prev) => ({ ...prev, lastContactDate: event.target.value }))}
                className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <DialogFooter>
              <button
                onClick={onCreate}
                disabled={saving}
                className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar cliente
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contato</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ultimo contato</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Carregando clientes...
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((client) => (
                <tr key={client.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="gradient-primary flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
                        <span className="text-xs font-bold text-primary-foreground">
                          {client.name
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-card-foreground">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {client.email || "-"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {client.phone || "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statusConfig[client.status])}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{formatDateBR(client.lastContactDate)}</td>
                  <td className="px-5 py-4">
                    <button className="rounded-lg p-1.5 transition-colors hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;
