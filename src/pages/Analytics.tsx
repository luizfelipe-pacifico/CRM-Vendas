import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { fetchActivities, fetchDeals, type ActivityRecord, type DealRecord } from "@/lib/crm-db";
import { calculateLeadScore } from "@/lib/lead-scoring";

const stageLabels: Record<string, string> = {
  sem_contato: "Sem contato",
  em_contato: "Em contato",
  diagnostico: "Diagnóstico",
  proposta_enviada: "Proposta",
  negociacao: "Negociação",
  fechado_ganho: "Ganho",
  fechado_perdido: "Perdido",
};

const temperatureLabels: Record<string, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
  em_negociacao: "Em negociação",
};

const pieColors = ["hsl(215 51% 25%)", "hsl(35 86% 47%)", "hsl(0 72% 48%)", "hsl(160 62% 35%)"];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const Analytics = () => {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [stageFilter, setStageFilter] = useState("todas");
  const [sourceFilter, setSourceFilter] = useState("todas");
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [temperatureFilter, setTemperatureFilter] = useState("todas");
  const [scoreFilter, setScoreFilter] = useState("todos");

  useEffect(() => {
    const load = async () => {
      try {
        const [dealsData, activitiesData] = await Promise.all([fetchDeals(), fetchActivities()]);
        setDeals(dealsData);
        setActivities(activitiesData);
      } catch (error) {
        toast.error("Não foi possível carregar análises", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sourceOptions = useMemo(() => Array.from(new Set(deals.map((deal) => deal.source).filter(Boolean))).sort(), [deals]);
  const ownerOptions = useMemo(() => Array.from(new Set(deals.map((deal) => deal.owner).filter(Boolean))).sort(), [deals]);

  const filteredDeals = useMemo(
    () =>
      deals.filter((deal) => {
        const stageMatch = stageFilter === "todas" || deal.stage === stageFilter;
        const sourceMatch = sourceFilter === "todas" || deal.source === sourceFilter;
        const ownerMatch = ownerFilter === "todos" || deal.owner === ownerFilter;
        const tempMatch = temperatureFilter === "todas" || deal.temperature === temperatureFilter;
        const leadScore = calculateLeadScore(deal).score;
        const scoreMatch =
          scoreFilter === "todos" ||
          (scoreFilter === "alto" && leadScore >= 60) ||
          (scoreFilter === "medio" && leadScore >= 35 && leadScore < 60) ||
          (scoreFilter === "baixo" && leadScore < 35);
        return stageMatch && sourceMatch && ownerMatch && tempMatch && scoreMatch;
      }),
    [deals, ownerFilter, scoreFilter, sourceFilter, stageFilter, temperatureFilter]
  );

  const report = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const openDeals = filteredDeals.filter((deal) => !["fechado_ganho", "fechado_perdido"].includes(deal.stage));
    const wonDeals = filteredDeals.filter((deal) => deal.stage === "fechado_ganho");
    const lostDeals = filteredDeals.filter((deal) => deal.stage === "fechado_perdido");

    const openValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
    const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals.length / totalDeals) * 100) : 0;
    const averageScore =
      filteredDeals.length > 0
        ? Math.round(filteredDeals.reduce((sum, deal) => sum + calculateLeadScore(deal).score, 0) / filteredDeals.length)
        : 0;

    return {
      totalDeals,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      openValue,
      wonValue,
      conversionRate,
      averageScore,
    };
  }, [filteredDeals]);

  const scoreData = useMemo(() => {
    const buckets = {
      baixo: 0,
      medio: 0,
      alto: 0,
    };

    filteredDeals.forEach((deal) => {
      const score = calculateLeadScore(deal).score;
      if (score >= 60) {
        buckets.alto += 1;
      } else if (score >= 35) {
        buckets.medio += 1;
      } else {
        buckets.baixo += 1;
      }
    });

    return [
      { faixa: "Baixo (0-34)", quantidade: buckets.baixo },
      { faixa: "Médio (35-59)", quantidade: buckets.medio },
      { faixa: "Alto (60+)", quantidade: buckets.alto },
    ];
  }, [filteredDeals]);

  const stageData = useMemo(() => {
    const grouped = new Map<string, { stage: string; quantidade: number; valor: number }>();
    filteredDeals.forEach((deal) => {
      const key = deal.stage;
      const current = grouped.get(key) || { stage: stageLabels[key] || key, quantidade: 0, valor: 0 };
      current.quantidade += 1;
      current.valor += deal.value;
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }, [filteredDeals]);

  const sourceData = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredDeals.forEach((deal) => {
      const key = deal.source || "Sem origem";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDeals]);

  const temperatureData = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredDeals.forEach((deal) => {
      const key = temperatureLabels[deal.temperature] || deal.temperature;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredDeals]);

  const activityStats = useMemo(() => {
    const done = activities.filter((activity) => activity.done).length;
    const pending = activities.length - done;
    return { done, pending, total: activities.length };
  }, [activities]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Carregando análises...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Análises</h1>
        <p className="mt-1 text-sm text-muted-foreground">Relatórios com filtros para monitorar desempenho comercial.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="todas">Todas as etapas</option>
            {Object.entries(stageLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="todas">Todas as origens</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <select
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="todos">Todos os responsáveis</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
          <select
            value={temperatureFilter}
            onChange={(event) => setTemperatureFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="todas">Todas as temperaturas</option>
            <option value="frio">Frio</option>
            <option value="morno">Morno</option>
            <option value="quente">Quente</option>
            <option value="em_negociacao">Em negociação</option>
          </select>
          <select
            value={scoreFilter}
            onChange={(event) => setScoreFilter(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="todos">Todos os scores</option>
            <option value="alto">Score alto (60+)</option>
            <option value="medio">Score médio (35-59)</option>
            <option value="baixo">Score baixo (0-34)</option>
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leads filtrados</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{report.totalDeals}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline aberto</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{report.openDeals}</p>
          <p className="text-xs text-muted-foreground">{formatMoney(report.openValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ganhos</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{report.wonDeals}</p>
          <p className="text-xs text-muted-foreground">{formatMoney(report.wonValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taxa de conversão</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{report.conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Perdidos: {report.lostDeals}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score médio</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{report.averageScore}/100</p>
          <p className="text-xs text-muted-foreground">Qualidade da base filtrada</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card xl:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Funil por etapa</h2>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  color: "hsl(var(--card-foreground))",
                }}
              />
              <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Temperatura dos leads</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={temperatureData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={42}>
                {temperatureData.map((entry, index) => (
                  <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  color: "hsl(var(--card-foreground))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {temperatureData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                  {item.name}
                </div>
                <span className="font-semibold text-card-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Origens com mais leads</h2>
          <div className="space-y-2">
            {sourceData.slice(0, 6).map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <span className="text-sm text-card-foreground">{row.name}</span>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{row.value}</span>
              </div>
            ))}
            {sourceData.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma origem encontrada.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Produtividade de atividades</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Total de atividades</p>
              <p className="text-2xl font-display font-bold text-card-foreground">{activityStats.total}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-xl font-bold text-success">{activityStats.done}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-warning">{activityStats.pending}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Distribuição de lead scoring</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={scoreData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                color: "hsl(var(--card-foreground))",
              }}
            />
            <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
};

export default Analytics;
