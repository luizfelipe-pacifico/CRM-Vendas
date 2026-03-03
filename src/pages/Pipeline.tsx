import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Loader2,
  Plus,
  Target,
} from "lucide-react";
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
import { createDeal, fetchDeals, updateDealStage, type DealRecord, type DealStage } from "@/lib/crm-db";

const stages = [
  { id: "sem_contato", label: "Sem contato", probability: 10 },
  { id: "em_contato", label: "Em contato", probability: 25 },
  { id: "diagnostico", label: "Diagnostico", probability: 40 },
  { id: "proposta_enviada", label: "Proposta enviada", probability: 60 },
  { id: "negociacao", label: "Negociacao", probability: 80 },
  { id: "fechado_ganho", label: "Fechado ganho", probability: 100 },
  { id: "fechado_perdido", label: "Fechado perdido", probability: 0 },
] as const;

type StageId = (typeof stages)[number]["id"];
type FollowUpView = "todas" | "atrasadas" | "hoje" | "semana" | "sem_followup";

interface DealForm {
  title: string;
  company: string;
  contact: string;
  owner: string;
  value: string;
  stage: StageId;
  nextAction: string;
  followUpDate: string;
  expectedClose: string;
  labels: string;
  checklistDone: string;
  checklistTotal: string;
}

const emptyForm: DealForm = {
  title: "",
  company: "",
  contact: "",
  owner: "",
  value: "",
  stage: "sem_contato",
  nextAction: "",
  followUpDate: "",
  expectedClose: "",
  labels: "",
  checklistDone: "0",
  checklistTotal: "0",
};

const stageStyles: Record<StageId, { dot: string; panel: string }> = {
  sem_contato: {
    dot: "bg-muted-foreground",
    panel: "border-border bg-secondary/60",
  },
  em_contato: {
    dot: "bg-info",
    panel: "border-primary/20 bg-primary/5",
  },
  diagnostico: {
    dot: "bg-primary",
    panel: "border-primary/25 bg-primary/10",
  },
  proposta_enviada: {
    dot: "bg-warning",
    panel: "border-warning/25 bg-warning/10",
  },
  negociacao: {
    dot: "bg-accent",
    panel: "border-accent/25 bg-accent/10",
  },
  fechado_ganho: {
    dot: "bg-success",
    panel: "border-success/25 bg-success/10",
  },
  fechado_perdido: {
    dot: "bg-destructive",
    panel: "border-destructive/25 bg-destructive/10",
  },
};

const closedStages: StageId[] = ["fechado_ganho", "fechado_perdido"];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const parseDateSafe = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDiffDays = (value: string) => {
  const date = parseDateSafe(value);
  if (!date) return null;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = target.getTime() - todayStart.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

const getFollowUpTag = (followUpDate: string) => {
  const diff = getDiffDays(followUpDate);

  if (diff === null) return { label: "Sem follow-up", tone: "bg-muted text-muted-foreground" };
  if (diff < 0) return { label: `Atrasado (${Math.abs(diff)}d)`, tone: "bg-destructive/15 text-destructive" };
  if (diff === 0) return { label: "Hoje", tone: "bg-warning/15 text-warning" };
  if (diff <= 7) return { label: `${diff}d`, tone: "bg-info/15 text-info" };
  return { label: `Em ${diff}d`, tone: "bg-success/15 text-success" };
};

const Pipeline = () => {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DealForm>(emptyForm);
  const [followView, setFollowView] = useState<FollowUpView>("todas");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [labelFilter, setLabelFilter] = useState("todas");

  useEffect(() => {
    const loadDeals = async () => {
      try {
        const data = await fetchDeals();
        setDeals(data);
      } catch (error) {
        toast.error("Nao foi possivel carregar o pipeline", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDeals();
  }, []);

  const moveDeal = async (dealId: string, newStage: StageId) => {
    const previous = deals;
    setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage: newStage } : deal)));

    try {
      await updateDealStage(dealId, newStage);
    } catch (error) {
      setDeals(previous);
      toast.error("Falha ao mover negocio", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const summary = useMemo(() => {
    const openDeals = deals.filter((deal) => !closedStages.includes(deal.stage));
    const wonDeals = deals.filter((deal) => deal.stage === "fechado_ganho");

    const totalOpenValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const totalWonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedForecast = deals.reduce((sum, deal) => {
      const stage = stages.find((item) => item.id === deal.stage);
      const probability = stage?.probability ?? 0;
      return sum + deal.value * (probability / 100);
    }, 0);

    return { openCount: openDeals.length, totalOpenValue, totalWonValue, weightedForecast };
  }, [deals]);

  const followUpSummary = useMemo(() => {
    const overdue = deals.filter((deal) => {
      const diff = getDiffDays(deal.followUpDate);
      return diff !== null && diff < 0;
    }).length;
    const today = deals.filter((deal) => getDiffDays(deal.followUpDate) === 0).length;
    const thisWeek = deals.filter((deal) => {
      const diff = getDiffDays(deal.followUpDate);
      return diff !== null && diff > 0 && diff <= 7;
    }).length;
    const withoutDate = deals.filter((deal) => getDiffDays(deal.followUpDate) === null).length;

    return { overdue, today, thisWeek, withoutDate };
  }, [deals]);

  const ownerOptions = useMemo(() => Array.from(new Set(deals.map((deal) => deal.owner).filter(Boolean))), [deals]);
  const labelOptions = useMemo(
    () => Array.from(new Set(deals.flatMap((deal) => deal.labels))).sort((a, b) => a.localeCompare(b)),
    [deals]
  );

  const matchesFollowUpView = (deal: DealRecord) => {
    const diff = getDiffDays(deal.followUpDate);
    switch (followView) {
      case "atrasadas":
        return diff !== null && diff < 0;
      case "hoje":
        return diff === 0;
      case "semana":
        return diff !== null && diff >= 0 && diff <= 7;
      case "sem_followup":
        return diff === null;
      default:
        return true;
    }
  };

  const filteredDeals = useMemo(
    () =>
      deals.filter((deal) => {
        const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
        const labelMatch = labelFilter === "todas" || deal.labels.includes(labelFilter);
        return ownerMatch && labelMatch && matchesFollowUpView(deal);
      }),
    [deals, followView, ownerFilter, labelFilter]
  );

  const viewCounters = useMemo(
    () => ({
      todas: deals.length,
      atrasadas: followUpSummary.overdue,
      hoje: followUpSummary.today,
      semana: followUpSummary.thisWeek,
      sem_followup: followUpSummary.withoutDate,
    }),
    [deals.length, followUpSummary]
  );

  const createDealRecord = async () => {
    if (!form.title.trim() || !form.company.trim()) {
      toast.error("Preencha ao menos titulo e empresa");
      return;
    }

    const value = Number(form.value.replace(",", "."));
    const checklistTotal = Math.max(Number(form.checklistTotal || "0"), 0);
    const checklistDone = Math.min(Math.max(Number(form.checklistDone || "0"), 0), checklistTotal);

    setSaving(true);
    try {
      const created = await createDeal({
        title: form.title.trim(),
        company: form.company.trim(),
        contact: form.contact.trim(),
        owner: form.owner.trim() || "Sem responsavel",
        value: Number.isFinite(value) ? value : 0,
        stage: form.stage,
        nextAction: form.nextAction.trim(),
        followUpDate: form.followUpDate,
        expectedClose: form.expectedClose,
        labels: form.labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        checklistDone,
        checklistTotal,
      });

      setDeals((prev) => [created, ...prev]);
      setForm(emptyForm);
      setDialogOpen(false);
      toast.success("Oportunidade criada", {
        description: "Negocio salvo no banco de dados.",
      });
    } catch (error) {
      toast.error("Falha ao criar negocio", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Funil de vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow-up inteligente com visoes rapidas (inspirado em RD/HubSpot) e etiquetas/checklist no estilo Trello.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="gradient-primary motion-surface inline-flex items-center gap-2 self-start rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow">
              <Plus className="h-4 w-4" />
              Nova oportunidade
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova oportunidade</DialogTitle>
              <DialogDescription>Cadastre rapido com follow-up, etiquetas e checklist.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Titulo do negocio"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.company}
                onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                placeholder="Empresa"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.contact}
                onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                placeholder="Contato"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.owner}
                onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}
                placeholder="Responsavel"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.value}
                onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                placeholder="Valor (ex: 12000)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <select
                value={form.stage}
                onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value as StageId }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={form.followUpDate}
                onChange={(event) => setForm((prev) => ({ ...prev, followUpDate: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="date"
                value={form.expectedClose}
                onChange={(event) => setForm((prev) => ({ ...prev, expectedClose: event.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.labels}
                onChange={(event) => setForm((prev) => ({ ...prev, labels: event.target.value }))}
                placeholder="Etiquetas (separe por virgula)"
                className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={form.nextAction}
                onChange={(event) => setForm((prev) => ({ ...prev, nextAction: event.target.value }))}
                placeholder="Proxima acao"
                className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="number"
                min={0}
                value={form.checklistDone}
                onChange={(event) => setForm((prev) => ({ ...prev, checklistDone: event.target.value }))}
                placeholder="Checklist concluido"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                type="number"
                min={0}
                value={form.checklistTotal}
                onChange={(event) => setForm((prev) => ({ ...prev, checklistTotal: event.target.value }))}
                placeholder="Checklist total"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <DialogFooter>
              <button
                onClick={createDealRecord}
                disabled={saving}
                className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar oportunidade
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="animate-soft-in rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Follow-ups atrasados</span>
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{followUpSummary.overdue}</p>
          <p className="text-xs text-muted-foreground">Priorize estes cards primeiro.</p>
        </div>
        <div className="animate-soft-in rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Follow-ups de hoje</span>
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{followUpSummary.today}</p>
          <p className="text-xs text-muted-foreground">Acoes com vencimento no dia.</p>
        </div>
        <div className="animate-soft-in rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Sem follow-up</span>
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{followUpSummary.withoutDate}</p>
          <p className="text-xs text-muted-foreground">Negocios que precisam de proxima acao.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Pipeline ativo</span>
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{summary.openCount} negocios</p>
          <p className="text-xs text-muted-foreground">{formatMoney(summary.totalOpenValue)} em aberto</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Forecast ponderado</span>
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{formatMoney(summary.weightedForecast)}</p>
          <p className="text-xs text-muted-foreground">Probabilidade por etapa aplicada</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Fechados ganhos</span>
          </div>
          <p className="text-2xl font-display font-bold text-card-foreground">{formatMoney(summary.totalWonValue)}</p>
          <p className="text-xs text-muted-foreground">Resultado comercial consolidado</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saude do funil</p>
          <p className="text-2xl font-display font-bold text-card-foreground">
            {summary.totalOpenValue > 0 ? Math.round((summary.weightedForecast / summary.totalOpenValue) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground">Conversao prevista do pipeline atual</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              { id: "todas", label: "Todas" },
              { id: "atrasadas", label: "Atrasadas" },
              { id: "hoje", label: "Hoje" },
              { id: "semana", label: "Proximos 7 dias" },
              { id: "sem_followup", label: "Sem follow-up" },
            ] as Array<{ id: FollowUpView; label: string }>).map((view) => (
              <button
                key={view.id}
                onClick={() => setFollowView(view.id)}
                className={cn(
                  "motion-surface rounded-full border px-3 py-1.5 text-xs font-semibold",
                  followView === view.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {view.label} ({viewCounters[view.id]})
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <select
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
            >
              <option value="todos">Todos os responsaveis</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
            <select
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
            >
              <option value="todas">Todas as etiquetas</option>
              {labelOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex-1 overflow-x-auto pb-2">
        <div className="grid min-w-max auto-cols-[310px] grid-flow-col gap-4">
          {stages.map((stage, stageIndex) => {
            const stageDeals = filteredDeals.filter((deal) => deal.stage === stage.id);
            const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
            const style = stageStyles[stage.id];

            return (
              <div
                key={stage.id}
                className={cn("animate-soft-in flex flex-col rounded-xl border p-3", style.panel)}
                style={{ animationDelay: `${stageIndex * 40}ms` }}
              >
                <div className="mb-3 rounded-lg border border-border/60 bg-card/80 p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                    <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-card-foreground">{formatMoney(stageValue)}</p>
                  <p className="text-[11px] text-muted-foreground">{stage.probability}% de probabilidade media</p>
                </div>

                <div
                  className="flex flex-1 flex-col gap-3 overflow-y-auto"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const dealId = event.dataTransfer.getData("dealId");
                    if (dealId) {
                      moveDeal(dealId, stage.id);
                    }
                  }}
                >
                  {loading && (
                    <div className="rounded-lg border border-dashed border-border bg-card/60 px-3 py-6 text-center text-xs text-muted-foreground">
                      Carregando...
                    </div>
                  )}

                  {!loading &&
                    stageDeals.map((deal) => {
                      const progress =
                        deal.checklistTotal > 0 ? Math.round((deal.checklistDone / deal.checklistTotal) * 100) : 0;
                      const followUpTag = getFollowUpTag(deal.followUpDate);

                      return (
                        <article
                          key={deal.id}
                          className="motion-surface cursor-grab rounded-xl border border-border bg-card p-3 shadow-card hover:shadow-card-hover active:cursor-grabbing"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("dealId", deal.id)}
                        >
                          <p className="text-sm font-semibold text-card-foreground">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">{deal.company}</p>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-base font-bold text-primary">{formatMoney(deal.value)}</span>
                            <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
                              {deal.owner}
                            </span>
                          </div>

                          {deal.labels.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {deal.labels.map((label) => (
                                <Badge key={label} variant="secondary" className="text-[10px]">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 rounded-lg bg-muted/60 px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Proxima acao</p>
                            <p className="mt-1 text-xs text-foreground">{deal.nextAction || "Sem acao definida"}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">Contato: {deal.contact || "-"}</p>
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", followUpTag.tone)}>
                              {followUpTag.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Fech.: {deal.expectedClose || "--/--/----"}
                            </span>
                          </div>

                          {deal.checklistTotal > 0 && (
                            <div className="mt-3">
                              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Checklist</span>
                                <span>
                                  {deal.checklistDone}/{deal.checklistTotal}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <select
                            value={deal.stage}
                            onChange={(event) => moveDeal(deal.id, event.target.value as StageId)}
                            className="mt-3 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-primary"
                          >
                            {stages.map((option) => (
                              <option key={option.id} value={option.id}>
                                Mover para: {option.label}
                              </option>
                            ))}
                          </select>
                        </article>
                      );
                    })}

                  {!loading && stageDeals.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card/60 px-3 py-6 text-center text-xs text-muted-foreground">
                      Nenhuma oportunidade nesta etapa.
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-lg border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
                  Arraste e solte oportunidades aqui
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pipeline;
