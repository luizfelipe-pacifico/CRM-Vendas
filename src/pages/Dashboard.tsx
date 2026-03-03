import { CalendarCheck, CircleDollarSign, Target, Users } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import MetricCard from "@/components/MetricCard";

const pipelineData: Array<{ month: string; aberto: number; ganho: number }> = [];
const nextActions: Array<{ id: number; title: string; time: string; status: "high" | "medium" | "normal" }> = [];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visao do funil de vendas e da rotina do time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Leads ativos"
          value="0"
          change="Sem dados cadastrados"
          changeType="neutral"
          icon={<Users className="h-5 w-5 text-primary-foreground" />}
        />
        <MetricCard
          title="Em diagnostico"
          value="0"
          change="Sem dados cadastrados"
          changeType="neutral"
          icon={<Target className="h-5 w-5 text-accent-foreground" />}
          gradient="gradient-accent"
        />
        <MetricCard
          title="Receita em aberto"
          value="R$ 0"
          change="Sem dados cadastrados"
          changeType="neutral"
          icon={<CircleDollarSign className="h-5 w-5 text-success-foreground" />}
          gradient="gradient-success"
        />
        <MetricCard
          title="Atividades pendentes"
          value="0"
          change="Sem dados cadastrados"
          changeType="neutral"
          icon={<CalendarCheck className="h-5 w-5 text-primary-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold text-card-foreground">Evolucao do pipeline</h3>
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
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(216 15% 83%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(218 11% 32%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(218 11% 32%)" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0 0% 100%)",
                    border: "1px solid hsl(216 15% 83%)",
                    borderRadius: "10px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="aberto"
                  stroke="hsl(215 51% 25%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#openValue)"
                />
                <Area
                  type="monotone"
                  dataKey="ganho"
                  stroke="hsl(160 62% 35%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#wonValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
              Sem dados no pipeline para exibir no grafico.
            </div>
          )}
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold text-card-foreground">Proximas acoes</h3>
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
                    {action.status === "high" ? "Alta prioridade" : action.status === "medium" ? "Media" : "Normal"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
              Nenhuma acao cadastrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
