import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CircleDollarSign, Loader2, Target, ThermometerSun, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import MetricCard from "@/components/MetricCard";
import { toast } from "@/components/ui/sonner";
import { fetchActivities, fetchDeals, type ActivityRecord, type DealRecord } from "@/lib/crm-db";
import { calculateLeadScore } from "@/lib/lead-scoring";

const closedStages = ["fechado_ganho", "fechado_perdido"];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const Dashboard = () => {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dealsData, activitiesData] = await Promise.all([fetchDeals(), fetchActivities()]);
        setDeals(dealsData);
        setActivities(activitiesData);
      } catch (error) {
        toast.error("Não foi possível carregar o dashboard", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const metrics = useMemo(() => {
    const openDeals = deals.filter((deal) => !closedStages.includes(deal.stage));
    const inDiagnostic = deals.filter((deal) => deal.stage === "diagnostico");
    const pendingActivities = activities.filter((activity) => !activity.done);
    const averageScore =
      deals.length > 0 ? Math.round(deals.reduce((sum, deal) => sum + calculateLeadScore(deal).score, 0) / deals.length) : 0;

    return {
      leads: openDeals.length,
      inDiagnostic: inDiagnostic.length,
      openValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
      pendingActivities: pendingActivities.length,
      averageScore,
    };
  }, [activities, deals]);

  const pipelineData = useMemo(() => {
    const labels: Record<DealRecord["stage"], string> = {
      sem_contato: "Sem contato",
      em_contato: "Em contato",
      diagnostico: "Diagnóstico",
      proposta_enviada: "Proposta",
      negociacao: "Negociação",
      fechado_ganho: "Fechado ganho",
      fechado_perdido: "Fechado perdido",
    };

    return Object.entries(labels).map(([stage, label]) => {
      const stageDeals = deals.filter((deal) => deal.stage === stage);
      return {
        month: label,
        aberto: stageDeals.length,
        ganho: stageDeals.reduce((sum, deal) => sum + deal.value, 0),
      };
    });
  }, [deals]);

  const nextActions = useMemo(() => {
    return deals
      .filter((deal) => !closedStages.includes(deal.stage))
      .sort((a, b) => {
        if (!a.followUpDate && !b.followUpDate) return 0;
        if (!a.followUpDate) return 1;
        if (!b.followUpDate) return -1;
        return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
      })
      .slice(0, 5)
      .map((deal, index) => ({
        id: index + 1,
        title: `${deal.company} - ${deal.nextAction || "Definir próxima ação"}`,
        time: deal.followUpDate ? new Date(`${deal.followUpDate}T00:00:00`).toLocaleDateString("pt-BR") : "Sem data definida",
        status: calculateLeadScore(deal).score >= 60 ? "high" : calculateLeadScore(deal).score >= 35 ? "medium" : "normal",
      }));
  }, [deals]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão do funil de vendas e da rotina do time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Leads ativos"
          value={String(metrics.leads)}
          change="Operação em andamento"
          changeType="positive"
          icon={<Users className="h-5 w-5 text-primary-foreground" />}
        />
        <MetricCard
          title="Em diagnóstico"
          value={String(metrics.inDiagnostic)}
          change="Etapa de qualificação"
          changeType="neutral"
          icon={<Target className="h-5 w-5 text-accent-foreground" />}
          gradient="gradient-accent"
        />
        <MetricCard
          title="Receita em aberto"
          value={formatMoney(metrics.openValue)}
          change="Pipeline atual"
          changeType="positive"
          icon={<CircleDollarSign className="h-5 w-5 text-success-foreground" />}
          gradient="gradient-success"
        />
        <MetricCard
          title="Atividades pendentes"
          value={String(metrics.pendingActivities)}
          change="Acompanhar diariamente"
          changeType="neutral"
          icon={<CalendarCheck className="h-5 w-5 text-primary-foreground" />}
        />
        <MetricCard
          title="Score médio"
          value={`${metrics.averageScore}/100`}
          change="Qualidade dos leads"
          changeType={metrics.averageScore >= 60 ? "positive" : "neutral"}
          icon={<ThermometerSun className="h-5 w-5 text-primary-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold text-card-foreground">Evolução do pipeline por etapa</h3>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={pipelineData}>
                <defs>
                  <linearGradient id="openValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(215 51% 25%)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="hsl(215 51% 25%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wonValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160 62% 35%)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="hsl(160 62% 35%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: "12px",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Area type="monotone" dataKey="aberto" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#openValue)" />
                <Area
                  type="monotone"
                  dataKey="ganho"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#wonValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
              Sem dados no pipeline para exibir no gráfico.
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold text-card-foreground">Próximas ações</h3>
          {nextActions.length > 0 ? (
            <div className="space-y-3">
              {nextActions.map((action) => (
                <div key={action.id} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-medium text-card-foreground">{action.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.time}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      action.status === "high"
                        ? "bg-destructive/10 text-destructive"
                        : action.status === "medium"
                        ? "bg-warning/10 text-warning"
                        : "bg-info/10 text-info"
                    }`}
                  >
                    {action.status === "high" ? "Alta prioridade" : action.status === "medium" ? "Média" : "Normal"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
              Nenhuma ação cadastrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
