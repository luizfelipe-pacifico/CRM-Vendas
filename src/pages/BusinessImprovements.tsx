import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, DollarSign, Plus, Shield, Trash2, TrendingUp, Users } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type AccessLevel = "administrador" | "gestor" | "funcionario";

interface OrganizationProfile {
  businessName: string;
  segment: string;
  adminName: string;
  adminEmail: string;
  monthlyRevenue: string;
  monthlyPayroll: string;
  visibleCosts: string;
  invisibleCosts: string;
  servicePrice: string;
  averageTicket: string;
  cac: string;
  salesCycleDays: string;
  employeesCount: string;
  managerCount: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: AccessLevel;
  monthlyCost: string;
}

interface MemberForm {
  name: string;
  email: string;
  role: AccessLevel;
  monthlyCost: string;
}

const storageKeyProfile = "crm-business-profile-v1";
const storageKeyMembers = "crm-business-members-v1";

const emptyProfile: OrganizationProfile = {
  businessName: "",
  segment: "",
  adminName: "",
  adminEmail: "",
  monthlyRevenue: "",
  monthlyPayroll: "",
  visibleCosts: "",
  invisibleCosts: "",
  servicePrice: "",
  averageTicket: "",
  cac: "",
  salesCycleDays: "",
  employeesCount: "",
  managerCount: "",
};

const emptyMemberForm: MemberForm = {
  name: "",
  email: "",
  role: "funcionario",
  monthlyCost: "",
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const parseNumber = (value: string) => {
  if (!value) return 0;
  const normalized = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roleTone: Record<AccessLevel, string> = {
  administrador: "bg-primary/15 text-primary",
  gestor: "bg-warning/15 text-warning",
  funcionario: "bg-muted text-muted-foreground",
};

const BusinessImprovements = () => {
  const [profile, setProfile] = useState<OrganizationProfile>(emptyProfile);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(storageKeyProfile);
      const savedMembers = localStorage.getItem(storageKeyMembers);
      if (savedProfile) {
        setProfile((current) => ({ ...current, ...(JSON.parse(savedProfile) as OrganizationProfile) }));
      }
      if (savedMembers) {
        setMembers(JSON.parse(savedMembers) as TeamMember[]);
      }
    } catch {
      toast.error("Falha ao carregar dados de melhorias", {
        description: "Os dados locais estão inválidos e foram ignorados.",
      });
    }
  }, []);

  const totals = useMemo(() => {
    const revenue = parseNumber(profile.monthlyRevenue);
    const payroll = parseNumber(profile.monthlyPayroll);
    const visibleCosts = parseNumber(profile.visibleCosts);
    const invisibleCosts = parseNumber(profile.invisibleCosts);
    const servicePrice = parseNumber(profile.servicePrice);
    const averageTicket = parseNumber(profile.averageTicket);
    const cac = parseNumber(profile.cac);
    const salesCycle = parseNumber(profile.salesCycleDays);
    const employeesCount = parseNumber(profile.employeesCount) || members.length;

    const membersCost = members.reduce((sum, member) => sum + parseNumber(member.monthlyCost), 0);
    const totalCosts = payroll + visibleCosts + invisibleCosts + membersCost;
    const margin = revenue > 0 ? ((revenue - totalCosts) / revenue) * 100 : 0;
    const invisibleShare = totalCosts > 0 ? (invisibleCosts / totalCosts) * 100 : 0;
    const recommendedPrice = employeesCount > 0 ? (totalCosts / employeesCount) * 1.35 : 0;
    const breakEvenRevenue = totalCosts * 1.12;
    const ticketToCacRatio = cac > 0 ? averageTicket / cac : 0;

    return {
      revenue,
      totalCosts,
      margin,
      invisibleShare,
      recommendedPrice,
      breakEvenRevenue,
      ticketToCacRatio,
      servicePrice,
      salesCycle,
      employeesCount,
    };
  }, [members, profile]);

  const insights = useMemo(() => {
    const items: Array<{ tone: "good" | "warn" | "risk"; title: string; description: string }> = [];

    if (totals.margin < 12) {
      items.push({
        tone: "risk",
        title: "Margem baixa",
        description: "A margem está apertada. Reavalie preço, custos invisíveis e produtividade comercial.",
      });
    } else if (totals.margin < 20) {
      items.push({
        tone: "warn",
        title: "Margem moderada",
        description: "Existe espaço para ganho de eficiência. Ajuste processo e custos operacionais.",
      });
    } else {
      items.push({
        tone: "good",
        title: "Margem saudável",
        description: "A operação tem fôlego para crescer com previsibilidade.",
      });
    }

    if (totals.servicePrice > 0 && totals.recommendedPrice > 0 && totals.servicePrice < totals.recommendedPrice) {
      items.push({
        tone: "risk",
        title: "Preço abaixo do ideal",
        description: `Preço atual ${formatMoney(totals.servicePrice)} abaixo do recomendado ${formatMoney(
          totals.recommendedPrice
        )}.`,
      });
    }

    if (totals.invisibleShare > 20) {
      items.push({
        tone: "warn",
        title: "Custo invisível elevado",
        description: "Custos invisíveis acima de 20% do total. Revise retrabalho, perdas e atrasos.",
      });
    }

    if (totals.salesCycle > 45) {
      items.push({
        tone: "warn",
        title: "Ciclo comercial longo",
        description: "Tempo de venda acima de 45 dias. Melhore qualificação e cadência de follow-up.",
      });
    }

    if (totals.ticketToCacRatio > 0 && totals.ticketToCacRatio < 3) {
      items.push({
        tone: "risk",
        title: "Relação ticket/CAC baixa",
        description: "Meta recomendada: ticket médio ao menos 3x maior que CAC.",
      });
    } else if (totals.ticketToCacRatio >= 3) {
      items.push({
        tone: "good",
        title: "Aquisição eficiente",
        description: "Ticket médio está acima de 3x CAC, indicando boa eficiência comercial.",
      });
    }

    return items;
  }, [totals]);

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      localStorage.setItem(storageKeyProfile, JSON.stringify(profile));
      toast.success("Dados da organização salvos com sucesso");
    } catch (error) {
      toast.error("Falha ao salvar organização", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const addMember = () => {
    if (!memberForm.name.trim()) {
      toast.error("Informe o nome do integrante");
      return;
    }

    const nextMember: TeamMember = {
      id: crypto.randomUUID(),
      name: memberForm.name.trim(),
      email: memberForm.email.trim(),
      role: memberForm.role,
      monthlyCost: memberForm.monthlyCost.trim(),
    };

    try {
      const nextMembers = [nextMember, ...members];
      setMembers(nextMembers);
      localStorage.setItem(storageKeyMembers, JSON.stringify(nextMembers));
      setMemberForm(emptyMemberForm);
      toast.success("Integrante adicionado com sucesso");
    } catch (error) {
      toast.error("Falha ao adicionar integrante", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  const removeMember = (memberId: string) => {
    try {
      const nextMembers = members.filter((member) => member.id !== memberId);
      setMembers(nextMembers);
      localStorage.setItem(storageKeyMembers, JSON.stringify(nextMembers));
      toast.success("Integrante removido com sucesso");
    } catch (error) {
      toast.error("Falha ao remover integrante", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Melhorias do negócio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre dados da empresa e use os indicadores para enxergar preço ideal, riscos e pontos de atenção.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <BriefcaseBusiness className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Organização e acesso</span>
        </div>
        <form onSubmit={saveProfile} className="grid gap-3 md:grid-cols-2">
          <input
            value={profile.businessName}
            onChange={(event) => setProfile((prev) => ({ ...prev, businessName: event.target.value }))}
            placeholder="Nome da empresa"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.segment}
            onChange={(event) => setProfile((prev) => ({ ...prev, segment: event.target.value }))}
            placeholder="Segmento"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.adminName}
            onChange={(event) => setProfile((prev) => ({ ...prev, adminName: event.target.value }))}
            placeholder="Administrador"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="email"
            value={profile.adminEmail}
            onChange={(event) => setProfile((prev) => ({ ...prev, adminEmail: event.target.value }))}
            placeholder="E-mail do administrador"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.employeesCount}
            onChange={(event) => setProfile((prev) => ({ ...prev, employeesCount: event.target.value }))}
            placeholder="Número de funcionários"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.managerCount}
            onChange={(event) => setProfile((prev) => ({ ...prev, managerCount: event.target.value }))}
            placeholder="Número de gestores"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.monthlyRevenue}
            onChange={(event) => setProfile((prev) => ({ ...prev, monthlyRevenue: event.target.value }))}
            placeholder="Receita mensal (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.monthlyPayroll}
            onChange={(event) => setProfile((prev) => ({ ...prev, monthlyPayroll: event.target.value }))}
            placeholder="Folha mensal (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.visibleCosts}
            onChange={(event) => setProfile((prev) => ({ ...prev, visibleCosts: event.target.value }))}
            placeholder="Custos visíveis mensais (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.invisibleCosts}
            onChange={(event) => setProfile((prev) => ({ ...prev, invisibleCosts: event.target.value }))}
            placeholder="Custos invisíveis mensais (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.servicePrice}
            onChange={(event) => setProfile((prev) => ({ ...prev, servicePrice: event.target.value }))}
            placeholder="Preço médio do serviço (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.averageTicket}
            onChange={(event) => setProfile((prev) => ({ ...prev, averageTicket: event.target.value }))}
            placeholder="Ticket médio (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.cac}
            onChange={(event) => setProfile((prev) => ({ ...prev, cac: event.target.value }))}
            placeholder="CAC médio (R$)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={profile.salesCycleDays}
            onChange={(event) => setProfile((prev) => ({ ...prev, salesCycleDays: event.target.value }))}
            placeholder="Ciclo de vendas (dias)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Salvar organização
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Equipe e níveis de acesso</span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={memberForm.name}
            onChange={(event) => setMemberForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nome"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={memberForm.email}
            onChange={(event) => setMemberForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="E-mail"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={memberForm.role}
            onChange={(event) => setMemberForm((prev) => ({ ...prev, role: event.target.value as AccessLevel }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="administrador">Administrador</option>
            <option value="gestor">Gestor</option>
            <option value="funcionario">Funcionário</option>
          </select>
          <div className="flex gap-2">
            <input
              value={memberForm.monthlyCost}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, monthlyCost: event.target.value }))}
              placeholder="Custo mensal (R$)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={addMember}
              className="inline-flex items-center rounded-lg border border-border bg-background px-3 text-foreground hover:bg-muted"
              aria-label="Adicionar integrante"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {members.length === 0 && <p className="text-sm text-muted-foreground">Nenhum integrante cadastrado ainda.</p>}
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
              <div>
                <p className="text-sm font-medium text-card-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email || "Sem e-mail"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", roleTone[member.role])}>
                  {member.role}
                </span>
                <span className="text-xs text-muted-foreground">{parseNumber(member.monthlyCost) ? formatMoney(parseNumber(member.monthlyCost)) : "-"}</span>
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  aria-label={`Remover ${member.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custos totais</p>
          <p className="mt-1 text-xl font-display font-bold text-card-foreground">{formatMoney(totals.totalCosts)}</p>
          <p className="text-xs text-muted-foreground">Break-even: {formatMoney(totals.breakEvenRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Margem estimada</p>
          <p className={cn("mt-1 text-xl font-display font-bold", totals.margin < 12 ? "text-destructive" : "text-success")}>
            {Number.isFinite(totals.margin) ? `${totals.margin.toFixed(1)}%` : "--"}
          </p>
          <p className="text-xs text-muted-foreground">Receita vs custo operacional</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preço recomendado</p>
          <p className="mt-1 text-xl font-display font-bold text-card-foreground">{formatMoney(totals.recommendedPrice)}</p>
          <p className="text-xs text-muted-foreground">Preço atual: {formatMoney(totals.servicePrice)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ticket/CAC</p>
          <p
            className={cn(
              "mt-1 text-xl font-display font-bold",
              totals.ticketToCacRatio > 0 && totals.ticketToCacRatio < 3 ? "text-warning" : "text-card-foreground"
            )}
          >
            {totals.ticketToCacRatio > 0 ? `${totals.ticketToCacRatio.toFixed(2)}x` : "--"}
          </p>
          <p className="text-xs text-muted-foreground">Referência saudável: 3x+</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Pontos de atenção e melhorias</span>
        </div>
        <div className="space-y-2">
          {insights.length === 0 && <p className="text-sm text-muted-foreground">Preencha os dados para gerar insights.</p>}
          {insights.map((insight, index) => (
            <div
              key={`${insight.title}-${index}`}
              className={cn(
                "rounded-lg border px-3 py-2",
                insight.tone === "good" && "border-success/30 bg-success/10",
                insight.tone === "warn" && "border-warning/30 bg-warning/10",
                insight.tone === "risk" && "border-destructive/30 bg-destructive/10"
              )}
            >
              <div className="flex items-start gap-2">
                {insight.tone === "risk" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                ) : insight.tone === "warn" ? (
                  <DollarSign className="mt-0.5 h-4 w-4 text-warning" />
                ) : (
                  <Users className="mt-0.5 h-4 w-4 text-success" />
                )}
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BusinessImprovements;
