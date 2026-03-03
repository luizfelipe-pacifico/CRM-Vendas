import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, CircleDollarSign, Kanban, Sparkles, Target, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { fetchActivities, fetchClients, fetchDeals, type ActivityRecord, type ClientRecord, type DealRecord } from "@/lib/crm-db";
import { calculateLeadScore } from "@/lib/lead-scoring";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const Home = () => {
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dealsData, clientsData, activitiesData] = await Promise.all([
          fetchDeals(),
          fetchClients(),
          fetchActivities(),
        ]);
        setDeals(dealsData);
        setClients(clientsData);
        setActivities(activitiesData);
      } catch (error) {
        toast.error("Não foi possível carregar o resumo inicial", {
          description: error instanceof Error ? error.message : "Tente novamente.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const metrics = useMemo(() => {
    const activeDeals = deals.filter((deal) => !["fechado_ganho", "fechado_perdido"].includes(deal.stage));
    const wonDeals = deals.filter((deal) => deal.stage === "fechado_ganho");
    const pendingActivities = activities.filter((activity) => !activity.done);
    const hotOrNegotiation = deals.filter((deal) => {
      const score = calculateLeadScore(deal).score;
      return score >= 60;
    });

    return {
      activeDeals: activeDeals.length,
      activeValue: activeDeals.reduce((sum, deal) => sum + deal.value, 0),
      wonValue: wonDeals.reduce((sum, deal) => sum + deal.value, 0),
      pendingActivities: pendingActivities.length,
      hotLeads: hotOrNegotiation.length,
      clients: clients.length,
    };
  }, [activities, clients.length, deals]);

  return (
    <div className="space-y-6" id="inicio">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Início
            </p>
            <h1 className="mt-3 text-2xl font-display font-bold text-card-foreground">Bem-vindo ao CRM Vendas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use esta área como central da operação. Daqui você acessa rapidamente dashboard, funil e execução diária.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard"
              className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Abrir dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pipeline"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              Abrir funil
              <Kanban className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leads ativos</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">
            {loading ? "--" : metrics.activeDeals}
          </p>
          <p className="text-xs text-muted-foreground">{loading ? "Carregando..." : formatMoney(metrics.activeValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leads com score alto</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">{loading ? "--" : metrics.hotLeads}</p>
          <p className="text-xs text-muted-foreground">Priorizar contato e proposta</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receita ganha</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">
            {loading ? "--" : formatMoney(metrics.wonValue)}
          </p>
          <p className="text-xs text-muted-foreground">Negócios fechados com sucesso</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atividades pendentes</p>
          <p className="mt-1 text-2xl font-display font-bold text-card-foreground">
            {loading ? "--" : metrics.pendingActivities}
          </p>
          <p className="text-xs text-muted-foreground">Clientes: {loading ? "--" : metrics.clients}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link to="/pipeline" className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Funil de vendas</span>
          </div>
          <p className="mt-2 text-sm text-card-foreground">
            Mova os leads pelas etapas da jornada comercial e converta automaticamente quando fechar.
          </p>
        </Link>
        <Link to="/atividades" className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarCheck2 className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Atividades</span>
          </div>
          <p className="mt-2 text-sm text-card-foreground">
            Organize follow-ups, ligações e reuniões para não perder oportunidades no ciclo de venda.
          </p>
        </Link>
        <Link to="/melhorias" className="rounded-xl border border-border bg-card p-4 shadow-card motion-surface">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CircleDollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Melhorias do negócio</span>
          </div>
          <p className="mt-2 text-sm text-card-foreground">
            Analise custos visíveis/invisíveis, produtividade da equipe e preço ideal para melhorar margem.
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Próximos passos sugeridos</span>
          </div>
          <ul className="space-y-2 text-sm text-card-foreground">
            <li>1. Cadastre novos leads em Sem contato no kanban.</li>
            <li>2. Defina metas por receita e conversão para o mês.</li>
            <li>3. Ative automações para follow-up após mudança de etapa.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Kanban className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Checklist de operação</span>
          </div>
          <ul className="space-y-2 text-sm text-card-foreground">
            <li>1. Revisar leads sem follow-up definido.</li>
            <li>2. Acompanhar deals com score acima de 60.</li>
            <li>3. Conferir atividades pendentes de hoje.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Home;
