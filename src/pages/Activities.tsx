import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock, Filter, Loader2, Mail, Phone, Plus, Video } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { createActivity, fetchActivities, updateActivityDone, type ActivityRecord, type ActivityType } from "@/lib/crm-db";

interface ActivityForm {
  type: ActivityType;
  title: string;
  client: string;
  date: string;
  time: string;
  responsible: string;
}

const emptyForm: ActivityForm = {
  type: "followup",
  title: "",
  client: "",
  date: "",
  time: "",
  responsible: "",
};

const typeIcons = {
  call: Phone,
  meeting: Video,
  email: Mail,
  followup: Clock,
};

const typeColors = {
  call: "bg-info/10 text-info",
  meeting: "bg-primary/10 text-primary",
  email: "bg-accent/10 text-accent",
  followup: "bg-warning/10 text-warning",
};

const formatDateBR = (isoDate: string) => {
  if (!isoDate) return "-";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("pt-BR");
};

const Activities = () => {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ActivityForm>(emptyForm);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await fetchActivities();
        setActivities(data);
      } catch (error) {
        toast.error("Nao foi possivel carregar atividades", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  const toggleDone = async (id: string) => {
    const current = activities.find((activity) => activity.id === id);
    if (!current) return;

    const nextDone = !current.done;
    setActivities((prev) => prev.map((activity) => (activity.id === id ? { ...activity, done: nextDone } : activity)));

    try {
      await updateActivityDone(id, nextDone);
    } catch (error) {
      setActivities((prev) => prev.map((activity) => (activity.id === id ? { ...activity, done: current.done } : activity)));
      toast.error("Falha ao atualizar atividade", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        if (filter === "pending") return !activity.done;
        if (filter === "done") return activity.done;
        return true;
      }),
    [activities, filter]
  );

  const onCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Informe o titulo da atividade");
      return;
    }

    setSaving(true);
    try {
      const activity = await createActivity({
        type: form.type,
        title: form.title.trim(),
        client: form.client.trim(),
        date: form.date,
        time: form.time,
        responsible: form.responsible.trim(),
      });

      setActivities((prev) => [activity, ...prev]);
      setForm(emptyForm);
      setDialogOpen(false);
      toast.success("Atividade criada com sucesso");
    } catch (error) {
      toast.error("Falha ao criar atividade", {
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
          <h1 className="text-2xl font-display font-bold text-foreground">Atividades</h1>
          <p className="mt-1 text-sm text-muted-foreground">{activities.filter((activity) => !activity.done).length} pendentes</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" />
              Nova atividade
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova atividade</DialogTitle>
              <DialogDescription>Crie uma nova tarefa de acompanhamento.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ActivityType }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="followup">Follow-up</option>
                <option value="call">Ligacao</option>
                <option value="meeting">Reuniao</option>
                <option value="email">E-mail</option>
              </select>
              <input
                value={form.responsible}
                onChange={(event) => setForm((prev) => ({ ...prev, responsible: event.target.value }))}
                placeholder="Responsavel"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Titulo da atividade"
                className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.client}
                onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
                placeholder="Cliente"
                className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <DialogFooter>
              <button
                onClick={onCreate}
                disabled={saving}
                className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar atividade
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "pending", "done"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {item === "all" ? "Todas" : item === "pending" ? "Pendentes" : "Concluidas"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Carregando atividades...
          </div>
        )}

        {!loading &&
          filteredActivities.map((activity) => {
            const Icon = typeIcons[activity.type];
            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover",
                  activity.done && "opacity-60"
                )}
              >
                <button onClick={() => toggleDone(activity.id)} className="flex-shrink-0">
                  {activity.done ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-border transition-colors hover:text-primary" />
                  )}
                </button>

                <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", typeColors[activity.type])}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium text-card-foreground", activity.done && "line-through")}>{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.client || "Sem cliente"}</p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-medium text-card-foreground">{formatDateBR(activity.date)}</p>
                  <p className="text-xs text-muted-foreground">{activity.time || "--:--"}</p>
                </div>

                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary"
                  title={activity.responsible}
                >
                  <span className="text-[10px] font-bold text-secondary-foreground">
                    {(activity.responsible || "SR")
                      .split(" ")
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
              </div>
            );
          })}

        {!loading && filteredActivities.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma atividade cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
