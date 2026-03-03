import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lightbulb, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type FeedbackType = "sugestao" | "melhoria" | "erro";
type FeedbackPriority = "baixa" | "media" | "alta";

interface FeedbackEntry {
  id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  area: string;
  message: string;
  createdAt: string;
}

interface FeedbackForm {
  type: FeedbackType;
  priority: FeedbackPriority;
  area: string;
  message: string;
}

const storageKey = "crm-feedback-list-v1";

const emptyForm: FeedbackForm = {
  type: "sugestao",
  priority: "media",
  area: "",
  message: "",
};

const toneByPriority: Record<FeedbackPriority, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-warning/15 text-warning",
  alta: "bg-destructive/15 text-destructive",
};

const typeLabel: Record<FeedbackType, string> = {
  sugestao: "Sugestão",
  melhoria: "Melhoria",
  erro: "Erro",
};

const priorityLabel: Record<FeedbackPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

const Feedback = () => {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [form, setForm] = useState<FeedbackForm>(emptyForm);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setEntries(JSON.parse(saved) as FeedbackEntry[]);
      }
    } catch {
      toast.error("Falha ao carregar feedbacks salvos");
    }
  }, []);

  const grouped = useMemo(() => {
    const suggestions = entries.filter((entry) => entry.type === "sugestao").length;
    const improvements = entries.filter((entry) => entry.type === "melhoria").length;
    const bugs = entries.filter((entry) => entry.type === "erro").length;
    return { suggestions, improvements, bugs };
  }, [entries]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.message.trim()) {
      toast.error("Descreva o feedback antes de enviar");
      return;
    }

    const nextEntry: FeedbackEntry = {
      id: crypto.randomUUID(),
      type: form.type,
      priority: form.priority,
      area: form.area.trim(),
      message: form.message.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const nextEntries = [nextEntry, ...entries];
      setEntries(nextEntries);
      localStorage.setItem(storageKey, JSON.stringify(nextEntries));
      setForm(emptyForm);
      toast.success("Feedback enviado com sucesso");
    } catch (error) {
      toast.error("Falha ao salvar feedback", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const onRemove = (id: string) => {
    try {
      const nextEntries = entries.filter((entry) => entry.id !== id);
      setEntries(nextEntries);
      localStorage.setItem(storageKey, JSON.stringify(nextEntries));
      toast.success("Feedback removido com sucesso");
    } catch (error) {
      toast.error("Falha ao remover feedback", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Melhorias e sugestões</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre melhorias, ideias e problemas para evoluir o CRM com prioridade clara.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugestões</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{grouped.suggestions}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Melhorias</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{grouped.improvements}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Erros reportados</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{grouped.bugs}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4">
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FeedbackType }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="sugestao">Sugestão</option>
            <option value="melhoria">Melhoria</option>
            <option value="erro">Erro</option>
          </select>
          <select
            value={form.priority}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as FeedbackPriority }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="baixa">Prioridade baixa</option>
            <option value="media">Prioridade média</option>
            <option value="alta">Prioridade alta</option>
          </select>
          <input
            value={form.area}
            onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
            placeholder="Área (kanban, clientes, etc.)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="gradient-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            Enviar feedback
          </button>
          <textarea
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Descreva a sugestão, melhoria ou problema..."
            className="md:col-span-4 min-h-[120px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Histórico de feedback</span>
        </div>
        <div className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-muted-foreground">Nenhum feedback registrado ainda.</p>}
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-card-foreground">{typeLabel[entry.type]}</span>
                    <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", toneByPriority[entry.priority])}>
                      {priorityLabel[entry.priority]}
                    </span>
                    {entry.area && <span className="text-xs text-muted-foreground">Área: {entry.area}</span>}
                  </div>
                  <p className="text-sm text-card-foreground">{entry.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  aria-label="Remover feedback"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Feedback;
