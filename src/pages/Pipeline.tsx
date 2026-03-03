import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Flag,
  Loader2,
  Mail,
  PanelTop,
  Phone,
  Plus,
  Target,
  Upload,
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
import {
  AutomationAction,
  createActivity,
  createAutomation,
  createClient,
  createDeal,
  createGoal,
  convertDealToClient,
  fetchAutomations,
  fetchDeals,
  fetchGoals,
  type AutomationRecord,
  type DealRecord,
  type DealTemperature,
  type GoalMetric,
  type GoalRecord,
  updateAutomationStatus,
  updateDeal,
  updateDealStage,
  updateGoalProgress,
} from "@/lib/crm-db";
import { calculateLeadScore, getLeadScoreLabel, getLeadScoreTone } from "@/lib/lead-scoring";

const stages = [
  { id: "sem_contato", label: "Sem contato", probability: 10 },
  { id: "em_contato", label: "Em contato", probability: 25 },
  { id: "diagnostico", label: "Diagnóstico", probability: 40 },
  { id: "proposta_enviada", label: "Proposta enviada", probability: 60 },
  { id: "negociacao", label: "Negociação", probability: 80 },
  { id: "fechado_ganho", label: "Fechado ganho", probability: 100 },
  { id: "fechado_perdido", label: "Fechado perdido", probability: 0 },
] as const;

type StageId = (typeof stages)[number]["id"];
type FollowUpView = "todas" | "atrasadas" | "hoje" | "semana" | "sem_followup";
type ImportType = "leads" | "clientes";
type ScoreView = "todos" | "alto" | "medio" | "baixo";

interface LeadForm {
  leadName: string;
  leadRole: string;
  leadEmail: string;
  leadPhone: string;
  company: string;
  title: string;
  owner: string;
  source: string;
  temperature: DealTemperature;
  segment: string;
  employees: string;
  annualRevenue: string;
  value: string;
  nextAction: string;
  notes: string;
  followUpDate: string;
  expectedClose: string;
  labels: string;
}

interface GoalForm {
  title: string;
  metric: GoalMetric;
  targetValue: string;
  currentValue: string;
  startDate: string;
  endDate: string;
}

interface AutomationForm {
  name: string;
  triggerStage: StageId | "";
  actionType: AutomationAction;
  payload: string;
}

const emptyLeadForm: LeadForm = {
  leadName: "",
  leadRole: "",
  leadEmail: "",
  leadPhone: "",
  company: "",
  title: "",
  owner: "",
  source: "",
  temperature: "morno",
  segment: "",
  employees: "",
  annualRevenue: "",
  value: "",
  nextAction: "",
  notes: "",
  followUpDate: "",
  expectedClose: "",
  labels: "",
};

const emptyGoalForm: GoalForm = {
  title: "",
  metric: "receita",
  targetValue: "",
  currentValue: "0",
  startDate: "",
  endDate: "",
};

const emptyAutomationForm: AutomationForm = {
  name: "",
  triggerStage: "",
  actionType: "create_activity",
  payload: '{"title":"Follow-up automático","daysOffset":2}',
};

const stageStyles: Record<StageId, { dot: string; panel: string }> = {
  sem_contato: { dot: "bg-muted-foreground", panel: "border-border bg-secondary/60" },
  em_contato: { dot: "bg-info", panel: "border-primary/20 bg-primary/5" },
  diagnostico: { dot: "bg-primary", panel: "border-primary/25 bg-primary/10" },
  proposta_enviada: { dot: "bg-warning", panel: "border-warning/25 bg-warning/10" },
  negociacao: { dot: "bg-accent", panel: "border-accent/25 bg-accent/10" },
  fechado_ganho: { dot: "bg-success", panel: "border-success/25 bg-success/10" },
  fechado_perdido: { dot: "bg-destructive", panel: "border-destructive/25 bg-destructive/10" },
};

const temperatureColor: Record<DealTemperature, string> = {
  quente: "bg-destructive/15 text-destructive",
  morno: "bg-warning/15 text-warning",
  frio: "bg-info/15 text-info",
  em_negociacao: "bg-success/15 text-success",
};

const closedStages: StageId[] = ["fechado_ganho", "fechado_perdido"];

const metricLabel: Record<GoalMetric, string> = {
  receita: "Receita",
  negocios_ganhos: "Negócios ganhos",
  taxa_conversao: "Taxa de conversão",
  atividades: "Atividades concluídas",
};

const actionLabel: Record<AutomationAction, string> = {
  create_activity: "Criar atividade",
  notify: "Notificar equipe",
  tag: "Aplicar etiqueta",
  move_stage: "Mover etapa",
};

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
  return Math.round((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
};

const getFollowUpTag = (followUpDate: string) => {
  const diff = getDiffDays(followUpDate);
  if (diff === null) return { label: "Sem follow-up", tone: "bg-muted text-muted-foreground" };
  if (diff < 0) return { label: `Atrasado (${Math.abs(diff)}d)`, tone: "bg-destructive/15 text-destructive" };
  if (diff === 0) return { label: "Hoje", tone: "bg-warning/15 text-warning" };
  if (diff <= 7) return { label: `${diff}d`, tone: "bg-info/15 text-info" };
  return { label: `Em ${diff}d`, tone: "bg-success/15 text-success" };
};

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parseNumber = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapTemperature = (value: string): DealTemperature => {
  const clean = normalizeHeader(value);
  if (clean.includes("quente")) return "quente";
  if (clean.includes("frio")) return "frio";
  if (clean.includes("negociacao")) return "em_negociacao";
  return "morno";
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === ";") && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
};

const parseCsvRows = (content: string) => {
  const lines = content
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((item) => normalizeHeader(item));

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
};

const Pipeline = () => {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [automations, setAutomations] = useState<AutomationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingLead, setSavingLead] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingAutomation, setSavingAutomation] = useState(false);
  const [importing, setImporting] = useState(false);

  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoalForm);
  const [automationForm, setAutomationForm] = useState<AutomationForm>(emptyAutomationForm);

  const [followView, setFollowView] = useState<FollowUpView>("todas");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [labelFilter, setLabelFilter] = useState("todas");
  const [scoreFilter, setScoreFilter] = useState<ScoreView>("todos");
  const [search, setSearch] = useState("");
  const [importType, setImportType] = useState<ImportType>("leads");
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dealsData, goalsData, automationsData] = await Promise.all([
          fetchDeals(),
          fetchGoals(),
          fetchAutomations(),
        ]);
        setDeals(dealsData);
        setGoals(goalsData);
        setAutomations(automationsData);
      } catch (error) {
        toast.error("Não foi possível carregar o pipeline", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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

    const averageScore = deals.length > 0 ? Math.round(deals.reduce((sum, deal) => sum + calculateLeadScore(deal).score, 0) / deals.length) : 0;
    const highScoreCount = deals.filter((deal) => calculateLeadScore(deal).score >= 60).length;

    return { openCount: openDeals.length, totalOpenValue, totalWonValue, weightedForecast, averageScore, highScoreCount };
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

  const matchesFollowUpView = useCallback(
    (deal: DealRecord) => {
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
    },
    [followView]
  );

  const filteredDeals = useMemo(
    () =>
      deals.filter((deal) => {
        const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
        const labelMatch = labelFilter === "todas" || deal.labels.includes(labelFilter);
        const leadScore = calculateLeadScore(deal).score;
        const scoreMatch =
          scoreFilter === "todos" ||
          (scoreFilter === "alto" && leadScore >= 60) ||
          (scoreFilter === "medio" && leadScore >= 35 && leadScore < 60) ||
          (scoreFilter === "baixo" && leadScore < 35);
        const searchTerm = search.trim().toLowerCase();
        const searchMatch =
          !searchTerm ||
          deal.company.toLowerCase().includes(searchTerm) ||
          deal.leadName.toLowerCase().includes(searchTerm) ||
          deal.title.toLowerCase().includes(searchTerm);
        return ownerMatch && labelMatch && scoreMatch && searchMatch && matchesFollowUpView(deal);
      }),
    [deals, ownerFilter, labelFilter, scoreFilter, search, matchesFollowUpView]
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

  const runAutomationsForStage = async (deal: DealRecord, newStage: StageId) => {
    const applicable = automations.filter(
      (automation) => automation.isActive && (!automation.triggerStage || automation.triggerStage === newStage)
    );

    for (const automation of applicable) {
      if (automation.actionType === "create_activity") {
        const payload = automation.actionPayload || {};
        const title = String(payload.title || `Follow-up automático: ${deal.company}`);
        const daysOffset = Number(payload.daysOffset || 2);
        const date = new Date();
        date.setDate(date.getDate() + (Number.isFinite(daysOffset) ? daysOffset : 2));

        await createActivity({
          type: "followup",
          title,
          client: deal.company,
          date: date.toISOString().slice(0, 10),
          time: "09:00",
          responsible: deal.owner || "Equipe comercial",
        });
      }

      if (automation.actionType === "notify") {
        toast.info(`Automação executada: ${automation.name}`);
      }

      if (automation.actionType === "tag") {
        const tag = String(automation.actionPayload?.tag || "automatizado").trim();
        const nextLabels = Array.from(new Set([...(deal.labels || []), tag].filter(Boolean)));
        await updateDeal(deal.id, { labels: nextLabels });
        setDeals((prev) => prev.map((item) => (item.id === deal.id ? { ...item, labels: nextLabels } : item)));
      }

      if (automation.actionType === "move_stage") {
        const target = String(automation.actionPayload?.targetStage || "");
        if (target && target !== newStage && stages.some((stage) => stage.id === target)) {
          await updateDealStage(deal.id, target as StageId);
          setDeals((prev) => prev.map((item) => (item.id === deal.id ? { ...item, stage: target as StageId } : item)));
        }
      }
    }
  };

  const moveDeal = async (dealId: string, newStage: StageId) => {
    const currentDeal = deals.find((deal) => deal.id === dealId);
    if (!currentDeal) return;

    const previousDeals = deals;
    setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage: newStage } : deal)));

    try {
      await updateDealStage(dealId, newStage);
      if (newStage === "fechado_ganho") {
        const convertedClient = await convertDealToClient({ ...currentDeal, stage: "fechado_ganho" });
        setDeals((prev) =>
          prev.map((deal) =>
            deal.id === dealId ? { ...deal, stage: "fechado_ganho", convertedClientId: convertedClient.id } : deal
          )
        );
        toast.success("Lead convertido em cliente", {
          description: `${convertedClient.name} agora aparece na aba Clientes.`,
        });
      }
      await runAutomationsForStage({ ...currentDeal, stage: newStage }, newStage);
      if (newStage !== "fechado_ganho") {
        const stageLabel = stages.find((stage) => stage.id === newStage)?.label ?? "etapa";
        toast.success("Lead movido com sucesso", {
          description: `${currentDeal.company} agora está em ${stageLabel}.`,
        });
      }
    } catch (error) {
      setDeals(previousDeals);
      toast.error("Falha ao mover lead", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const onCreateLead = async () => {
    if (!leadForm.company.trim() || !leadForm.leadName.trim()) {
      toast.error("Preencha empresa e nome do lead");
      return;
    }

    setSavingLead(true);
    try {
      const created = await createDeal({
        title: leadForm.title.trim() || `${leadForm.company.trim()} - ${leadForm.leadName.trim()}`,
        company: leadForm.company.trim(),
        contact: leadForm.leadName.trim(),
        leadName: leadForm.leadName.trim(),
        leadRole: leadForm.leadRole.trim(),
        leadEmail: leadForm.leadEmail.trim(),
        leadPhone: leadForm.leadPhone.trim(),
        owner: leadForm.owner.trim() || "Sem responsável",
        value: parseNumber(leadForm.value),
        stage: "sem_contato",
        source: leadForm.source.trim(),
        temperature: leadForm.temperature,
        segment: leadForm.segment.trim(),
        employees: leadForm.employees.trim() ? Number(leadForm.employees) : null,
        annualRevenue: leadForm.annualRevenue.trim() ? parseNumber(leadForm.annualRevenue) : null,
        nextAction: leadForm.nextAction.trim(),
        notes: leadForm.notes.trim(),
        followUpDate: leadForm.followUpDate,
        expectedClose: leadForm.expectedClose,
        labels: leadForm.labels
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        checklistDone: 0,
        checklistTotal: 3,
        convertedClientId: "",
      });

      setDeals((prev) => [created, ...prev]);
      setLeadForm(emptyLeadForm);
      setLeadDialogOpen(false);
      toast.success("Lead cadastrado em Sem contato");
    } catch (error) {
      toast.error("Falha ao cadastrar lead", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingLead(false);
    }
  };

  const onCreateGoal = async () => {
    if (!goalForm.title.trim()) {
      toast.error("Informe o título da meta");
      return;
    }

    setSavingGoal(true);
    try {
      const created = await createGoal({
        title: goalForm.title.trim(),
        metric: goalForm.metric,
        targetValue: parseNumber(goalForm.targetValue),
        currentValue: parseNumber(goalForm.currentValue),
        startDate: goalForm.startDate,
        endDate: goalForm.endDate,
      });
      setGoals((prev) => [created, ...prev]);
      setGoalForm(emptyGoalForm);
      toast.success("Meta criada com sucesso");
    } catch (error) {
      toast.error("Falha ao criar meta", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingGoal(false);
    }
  };

  const onUpdateGoalProgress = async (goalId: string, currentValue: number) => {
    const previous = goals;
    setGoals((prev) => prev.map((goal) => (goal.id === goalId ? { ...goal, currentValue } : goal)));
    try {
      await updateGoalProgress(goalId, currentValue);
      toast.success("Meta atualizada");
    } catch (error) {
      setGoals(previous);
      toast.error("Falha ao atualizar meta", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const onCreateAutomation = async () => {
    if (!automationForm.name.trim()) {
      toast.error("Informe o nome da automação");
      return;
    }

    setSavingAutomation(true);
    try {
      const payload = automationForm.payload.trim() ? JSON.parse(automationForm.payload) : {};
      const created = await createAutomation({
        name: automationForm.name.trim(),
        triggerStage: automationForm.triggerStage,
        actionType: automationForm.actionType,
        actionPayload: payload,
        isActive: true,
      });
      setAutomations((prev) => [created, ...prev]);
      setAutomationForm(emptyAutomationForm);
      toast.success("Automação criada com sucesso");
    } catch (error) {
      toast.error("Falha ao criar automação", {
        description: error instanceof Error ? error.message : "Revise o payload JSON.",
      });
    } finally {
      setSavingAutomation(false);
    }
  };

  const onToggleAutomation = async (automation: AutomationRecord) => {
    const nextStatus = !automation.isActive;
    const previous = automations;
    setAutomations((prev) => prev.map((item) => (item.id === automation.id ? { ...item, isActive: nextStatus } : item)));
    try {
      await updateAutomationStatus(automation.id, nextStatus);
      toast.success(`Automação ${nextStatus ? "ativada" : "desativada"} com sucesso`);
    } catch (error) {
      setAutomations(previous);
      toast.error("Falha ao atualizar automação", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const readSpreadsheetRows = async (file: File) => {
    const content = await file.text();
    return parseCsvRows(content);
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setImportFile(file);
  };

  const onImport = async () => {
    if (!importFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    if (importFile.name.toLowerCase().endsWith(".pdf")) {
      toast.info("Upload de PDF recebido", {
        description: "Para importação automática, use CSV/XLSX.",
      });
      setImportDialogOpen(false);
      setImportFile(null);
      return;
    }

    if (!importFile.name.toLowerCase().endsWith(".csv")) {
      toast.info("Formato de planilha ainda não suportado neste upload", {
        description: "No momento, importe CSV. XLSX/PDF podem ser enviados para processamento manual.",
      });
      return;
    }

    setImporting(true);
    try {
      const rows = await readSpreadsheetRows(importFile);
      if (rows.length === 0) {
        toast.error("Nenhum registro encontrado na planilha");
        return;
      }

      let imported = 0;

      if (importType === "leads") {
        for (const row of rows) {
          const company = row.empresa || row.company || row.organizacao || row.organizacao_nome;
          const leadName = row.nome || row.lead || row.lead_name || row.contato;
          if (!company || !leadName) continue;

          await createDeal({
            title: row.titulo || `${company} - ${leadName}`,
            company,
            contact: leadName,
            leadName,
            leadRole: row.cargo || row.funcao || "",
            leadEmail: row.email || "",
            leadPhone: row.telefone || row.celular || "",
            owner: row.responsavel || "Sem responsável",
            value: parseNumber(row.valor || row.ticket_medio || "0"),
            stage: "sem_contato",
            source: row.origem || "",
            temperature: mapTemperature(row.status || row.temperatura || ""),
            segment: row.segmento || "",
            employees: row.funcionarios ? Number(row.funcionarios) : null,
            annualRevenue: row.receita_anual || row.receita ? parseNumber(row.receita_anual || row.receita) : null,
            nextAction: row.proxima_acao || row.next_action || "Realizar diagnóstico inicial",
            notes: row.nota || row.observacoes || row.observacao || "",
            followUpDate: row.followup || row.follow_up || row.follow_up_date || "",
            expectedClose: row.fechamento || row.expected_close || "",
            labels: String(row.tags || row.etiquetas || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            checklistDone: 0,
            checklistTotal: 3,
            convertedClientId: "",
          });
          imported += 1;
        }
        setDeals(await fetchDeals());
      } else {
        for (const row of rows) {
          const name = row.nome || row.cliente || row.company || row.empresa;
          if (!name) continue;
          await createClient({
            name,
            email: row.email || "",
            phone: row.telefone || row.celular || "",
            status: "potencial",
            tags: String(row.tags || row.etiquetas || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            lastContactDate: row.ultimo_contato || row.last_contact || "",
          });
          imported += 1;
        }
      }

      toast.success("Importação concluída", {
        description: `${imported} registro(s) importado(s) com sucesso.`,
      });
      setImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      toast.error("Falha na importação", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Funil de vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Processo recomendado: cadastrar lead em <strong>Sem contato</strong>, avançar no funil e converter em cliente
            ao marcar venda.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
            <DialogTrigger asChild>
              <button className="gradient-primary motion-surface inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-primary-glow">
                <Plus className="h-4 w-4" />
                Novo lead
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar lead</DialogTitle>
                <DialogDescription>Todo lead novo entra em Sem contato.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={leadForm.leadName}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, leadName: event.target.value }))}
                  placeholder="Nome do lead"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.leadRole}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, leadRole: event.target.value }))}
                  placeholder="Cargo"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.company}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, company: event.target.value }))}
                  placeholder="Empresa"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.owner}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, owner: event.target.value }))}
                  placeholder="Responsável"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.leadEmail}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, leadEmail: event.target.value }))}
                  placeholder="E-mail"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.leadPhone}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, leadPhone: event.target.value }))}
                  placeholder="Telefone"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.source}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, source: event.target.value }))}
                  placeholder="Origem"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                  value={leadForm.temperature}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, temperature: event.target.value as DealTemperature }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="frio">Frio</option>
                  <option value="morno">Morno</option>
                  <option value="quente">Quente</option>
                  <option value="em_negociacao">Em negociação</option>
                </select>
                <input
                  value={leadForm.segment}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, segment: event.target.value }))}
                  placeholder="Segmento"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.employees}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, employees: event.target.value }))}
                  placeholder="Funcionários"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.annualRevenue}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, annualRevenue: event.target.value }))}
                  placeholder="Receita anual (R$)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.value}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, value: event.target.value }))}
                  placeholder="Valor potencial (R$)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.nextAction}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, nextAction: event.target.value }))}
                  placeholder="Próxima ação"
                  className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <textarea
                  value={leadForm.notes}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Observações"
                  className="sm:col-span-2 min-h-[84px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="date"
                  value={leadForm.followUpDate}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, followUpDate: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="date"
                  value={leadForm.expectedClose}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, expectedClose: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={leadForm.labels}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, labels: event.target.value }))}
                  placeholder="Etiquetas (vírgula)"
                  className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <DialogFooter>
                <button
                  onClick={onCreateLead}
                  disabled={savingLead}
                  className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {savingLead && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar lead
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
            <DialogTrigger asChild>
              <button className="motion-surface inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                <Flag className="h-4 w-4" />
                Metas
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Metas comerciais</DialogTitle>
                <DialogDescription>Defina metas e acompanhe o progresso.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                {goals.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>}
                {goals.map((goal) => {
                  const progress = goal.targetValue > 0 ? Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100) : 0;
                  return (
                    <div key={goal.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-semibold text-card-foreground">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {metricLabel[goal.metric]}: {formatMoney(goal.currentValue)} de {formatMoney(goal.targetValue)}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <input
                        type="number"
                        min={0}
                        defaultValue={goal.currentValue}
                        onBlur={(event) => onUpdateGoalProgress(goal.id, Number(event.target.value || "0"))}
                        className="mt-2 w-36 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={goalForm.title}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Título da meta"
                  className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                  value={goalForm.metric}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, metric: event.target.value as GoalMetric }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="receita">Receita</option>
                  <option value="negocios_ganhos">Negócios ganhos</option>
                  <option value="taxa_conversao">Taxa de conversão</option>
                  <option value="atividades">Atividades concluídas</option>
                </select>
                <input
                  value={goalForm.targetValue}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, targetValue: event.target.value }))}
                  placeholder="Meta alvo"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={goalForm.currentValue}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, currentValue: event.target.value }))}
                  placeholder="Valor atual"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="date"
                  value={goalForm.startDate}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="date"
                  value={goalForm.endDate}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, endDate: event.target.value }))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <DialogFooter>
                <button
                  onClick={onCreateGoal}
                  disabled={savingGoal}
                  className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {savingGoal && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar meta
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={automationDialogOpen} onOpenChange={setAutomationDialogOpen}>
            <DialogTrigger asChild>
              <button className="motion-surface inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                <Bot className="h-4 w-4" />
                Automações
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Automações de vendas</DialogTitle>
                <DialogDescription>Configure ações automáticas por etapa do funil.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                {automations.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma automação cadastrada.</p>}
                {automations.map((automation) => (
                  <div key={automation.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{automation.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {actionLabel[automation.actionType]}{" "}
                          {automation.triggerStage
                            ? `na etapa ${stages.find((item) => item.id === automation.triggerStage)?.label}`
                            : "em qualquer etapa"}
                        </p>
                      </div>
                      <button
                        onClick={() => onToggleAutomation(automation)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          automation.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {automation.isActive ? "Ativa" : "Inativa"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={automationForm.name}
                  onChange={(event) => setAutomationForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nome da automação"
                  className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                  value={automationForm.triggerStage}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, triggerStage: event.target.value as StageId | "" }))
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Qualquer etapa</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
                <select
                  value={automationForm.actionType}
                  onChange={(event) =>
                    setAutomationForm((prev) => ({ ...prev, actionType: event.target.value as AutomationAction }))
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="create_activity">Criar atividade</option>
                  <option value="notify">Notificar equipe</option>
                  <option value="tag">Aplicar etiqueta</option>
                  <option value="move_stage">Mover etapa</option>
                </select>
                <textarea
                  value={automationForm.payload}
                  onChange={(event) => setAutomationForm((prev) => ({ ...prev, payload: event.target.value }))}
                  className="sm:col-span-2 min-h-[90px] rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>
              <DialogFooter>
                <button
                  onClick={onCreateAutomation}
                  disabled={savingAutomation}
                  className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {savingAutomation && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar automação
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <button className="motion-surface inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                <Upload className="h-4 w-4" />
                Importar base
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar leads ou clientes</DialogTitle>
                <DialogDescription>Suporta CSV/XLSX e opção de upload PDF.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <select
                  value={importType}
                  onChange={(event) => setImportType(event.target.value as ImportType)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="leads">Importar para leads (kanban)</option>
                  <option value="clientes">Importar para clientes</option>
                </select>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleImportFileChange}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
                />
              </div>
              <DialogFooter>
                <button
                  onClick={onImport}
                  disabled={importing}
                  className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Importar
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={panelDialogOpen} onOpenChange={setPanelDialogOpen}>
            <DialogTrigger asChild>
              <button className="motion-surface inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground">
                <PanelTop className="h-4 w-4" />
                Painel do funil
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Indicadores do kanban</DialogTitle>
                <DialogDescription>Painel separado para acompanhar a operação.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Pipeline ativo</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-card-foreground">{summary.openCount} negócios</p>
                  <p className="text-xs text-muted-foreground">{formatMoney(summary.totalOpenValue)} em aberto</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Forecast ponderado</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-card-foreground">{formatMoney(summary.weightedForecast)}</p>
                  <p className="text-xs text-muted-foreground">Probabilidade por etapa</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <CircleDollarSign className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Fechados ganhos</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-card-foreground">{formatMoney(summary.totalWonValue)}</p>
                  <p className="text-xs text-muted-foreground">Resultado consolidado</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Follow-ups atrasados</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-card-foreground">{followUpSummary.overdue}</p>
                  <p className="text-xs text-muted-foreground">Sem ação no prazo</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Follow-ups de hoje</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-card-foreground">{followUpSummary.today}</p>
                  <p className="text-xs text-muted-foreground">Ações para executar hoje</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Lead scoring</span>
                  </div>
                  <p className="text-2xl font-display font-bold text-card-foreground">{summary.averageScore}/100</p>
                  <p className="text-xs text-muted-foreground">{summary.highScoreCount} lead(s) com score alto</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              { id: "todas", label: "Todas" },
              { id: "atrasadas", label: "Atrasadas" },
              { id: "hoje", label: "Hoje" },
              { id: "semana", label: "Próximos 7 dias" },
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

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar lead ou empresa..."
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
            />
            <select
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
            >
              <option value="todos">Todos os responsáveis</option>
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
            <select
              value={scoreFilter}
              onChange={(event) => setScoreFilter(event.target.value as ScoreView)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
            >
              <option value="todos">Todos os scores</option>
              <option value="alto">Score alto (60+)</option>
              <option value="medio">Score médio (35-59)</option>
              <option value="baixo">Score baixo (0-34)</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex-1 overflow-x-auto pb-2">
        <div className="grid min-w-max auto-cols-[325px] grid-flow-col gap-4">
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
                  <p className="text-[11px] text-muted-foreground">{stage.probability}% de probabilidade média</p>
                </div>

                <div
                  className="flex flex-1 flex-col gap-3 overflow-y-auto"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const dealId = event.dataTransfer.getData("dealId");
                    if (dealId) moveDeal(dealId, stage.id);
                  }}
                >
                  {loading && (
                    <div className="rounded-lg border border-dashed border-border bg-card/60 px-3 py-6 text-center text-xs text-muted-foreground">
                      Carregando...
                    </div>
                  )}

                  {!loading &&
                    stageDeals.map((deal) => {
                      const followUpTag = getFollowUpTag(deal.followUpDate);
                      const leadScore = calculateLeadScore(deal);
                      return (
                        <article
                          key={deal.id}
                          className="motion-surface cursor-grab rounded-xl border border-border bg-card p-3 shadow-card hover:shadow-card-hover active:cursor-grabbing"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("dealId", deal.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-card-foreground">{deal.company}</p>
                              <p className="text-xs text-muted-foreground">{deal.leadName || deal.contact}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", temperatureColor[deal.temperature])}>
                                {deal.temperature === "em_negociacao"
                                  ? "Em negociação"
                                  : deal.temperature.charAt(0).toUpperCase() + deal.temperature.slice(1)}
                              </span>
                              <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", getLeadScoreTone(leadScore.band))}>
                                Score {leadScore.score} ({getLeadScoreLabel(leadScore.band)})
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                            {deal.leadRole && <p>{deal.leadRole}</p>}
                            {deal.leadEmail && (
                              <p className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {deal.leadEmail}
                              </p>
                            )}
                            {deal.leadPhone && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {deal.leadPhone}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-base font-bold text-primary">{formatMoney(deal.value)}</span>
                            <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
                              {deal.owner || "Sem responsável"}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            {deal.source && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                Origem: {deal.source}
                              </Badge>
                            )}
                            {deal.segment && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {deal.segment}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 rounded-lg bg-muted/60 px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Próxima ação</p>
                            <p className="mt-1 text-xs text-foreground">{deal.nextAction || "Sem ação definida"}</p>
                            {deal.notes && <p className="mt-1 text-[11px] text-muted-foreground">Obs.: {deal.notes}</p>}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", followUpTag.tone)}>
                              {followUpTag.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground">Fech.: {deal.expectedClose || "--/--/----"}</span>
                          </div>

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

                          {deal.stage !== "fechado_ganho" && (
                            <button
                              onClick={() => moveDeal(deal.id, "fechado_ganho")}
                              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Marcar venda e converter cliente
                            </button>
                          )}
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
                  Arraste e solte leads aqui
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
