import { useState } from "react";
import { Search, Plus, Mail, Phone, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: "ativo" | "inativo" | "potencial";
  tags: string[];
  lastContact: string;
}

const clientsData: Client[] = [];

const statusConfig = {
  ativo: "bg-success/10 text-success border-success/20",
  inativo: "bg-muted text-muted-foreground border-border",
  potencial: "bg-warning/10 text-warning border-warning/20",
};

const Clients = () => {
  const [search, setSearch] = useState("");

  const filtered = clientsData.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{clientsData.length} clientes cadastrados</p>
        </div>
        <button className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
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
            {filtered.map((client) => (
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
                      <Mail className="h-3 w-3" /> {client.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {client.phone}
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
                <td className="px-5 py-4 text-sm text-muted-foreground">{client.lastContact}</td>
                <td className="px-5 py-4">
                  <button className="rounded-lg p-1.5 transition-colors hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
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
