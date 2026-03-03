const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/g)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  throw new Error("Variáveis do Supabase não encontradas em .env.local");
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const owner = "Luíz Felipe Pacífico";

const leads = [
  {
    leadName: "Rafaela Duarte",
    leadRole: "Gerente Comercial",
    company: "Lumena Soluções B2B",
    leadEmail: "rafaela.duarte@lumena.com.br",
    leadPhone: "(11) 99832-4710",
    segment: "SaaS",
    employees: 45,
    annualRevenue: 2800000,
    source: "LinkedIn Ads",
    temperature: "quente",
    note: "Demonstrou interesse em automação de follow-up. Reunião agendada para a 2ª semana de março.",
    nextAction: "Conduzir reunião de diagnóstico e apresentar fluxo de follow-up automatizado.",
    followUpDate: "2026-03-10",
    expectedClose: "2026-03-28",
    value: 18000,
  },
  {
    leadName: "Thiago Mendonça",
    leadRole: "Diretor de Vendas",
    company: "Construtora Pioneira",
    leadEmail: "thiago.m@pioneiraeng.com.br",
    leadPhone: "(31) 98741-2203",
    segment: "Construção Civil",
    employees: 120,
    annualRevenue: 9400000,
    source: "Indicação",
    temperature: "morno",
    note: "Equipe comercial de 8 pessoas sem processo estruturado. Avaliando 3 ferramentas.",
    nextAction: "Agendar demo com foco em estruturação do time e funil por etapas.",
    followUpDate: "2026-03-12",
    expectedClose: "2026-04-20",
    value: 26000,
  },
  {
    leadName: "Camila Esteves",
    leadRole: "CEO",
    company: "Doce Arte Confeitaria",
    leadEmail: "camila@docearterj.com.br",
    leadPhone: "(21) 97623-8845",
    segment: "Alimentício / Varejo",
    employees: 12,
    annualRevenue: 480000,
    source: "Orgânico (Instagram)",
    temperature: "frio",
    note: "Negócio em crescimento, mas resistência a custo de ferramenta. Priorizar plano básico.",
    nextAction: "Enviar proposta de plano básico com foco em ROI rápido.",
    followUpDate: "2026-03-18",
    expectedClose: "2026-04-30",
    value: 4500,
  },
  {
    leadName: "Leonardo Prates",
    leadRole: "Head de Parcerias",
    company: "Fintrack Consultoria Financeira",
    leadEmail: "leo.prates@fintrack.com.br",
    leadPhone: "(11) 93341-6672",
    segment: "Fintech / Consultoria",
    employees: 28,
    annualRevenue: 1600000,
    source: "Webinar",
    temperature: "quente",
    note: "Precisa de CRM com integração via API. Decisor principal. Prazo: fim de março.",
    nextAction: "Validar requisitos técnicos de API e apresentar escopo de integração.",
    followUpDate: "2026-03-15",
    expectedClose: "2026-03-31",
    value: 22000,
  },
  {
    leadName: "Mariana Vasconcelos",
    leadRole: "Supervisora Comercial",
    company: "MedFlex Planos de Saúde",
    leadEmail: "mariana.v@medflex.com.br",
    leadPhone: "(81) 99204-5531",
    segment: "Saúde / Planos",
    employees: 67,
    annualRevenue: 4200000,
    source: "Google Ads",
    temperature: "em_negociacao",
    note: "Processo de compra envolve aprovação do financeiro. Follow-up previsto para 10/03.",
    nextAction: "Preparar justificativa financeira para aprovação interna.",
    followUpDate: "2026-03-10",
    expectedClose: "2026-03-25",
    value: 32000,
  },
  {
    leadName: "Bruno Cavalcante",
    leadRole: "Sócio-fundador",
    company: "Agência Nortex",
    leadEmail: "bruno@nortexagencia.com.br",
    leadPhone: "(85) 98832-1104",
    segment: "Marketing / Agência",
    employees: 9,
    annualRevenue: 620000,
    source: "Evento presencial",
    temperature: "morno",
    note: "Usa planilha atualmente. Aberto a migrar, mas quer ver demonstração antes.",
    nextAction: "Executar demonstração orientada para migração de planilhas.",
    followUpDate: "2026-03-17",
    expectedClose: "2026-04-22",
    value: 8000,
  },
  {
    leadName: "Juliana Rocha",
    leadRole: "Gerente de Relacionamento",
    company: "Imobiliária Ativo Prime",
    leadEmail: "juliana.rocha@ativoprime.com.br",
    leadPhone: "(41) 97712-3390",
    segment: "Imobiliário",
    employees: 35,
    annualRevenue: 3100000,
    source: "LinkedIn Orgânico",
    temperature: "quente",
    note: "Equipe com alto volume de leads perdidos por falta de gestão. Urgência alta.",
    nextAction: "Priorizar apresentação com plano de recuperação de leads perdidos.",
    followUpDate: "2026-03-09",
    expectedClose: "2026-03-29",
    value: 16000,
  },
  {
    leadName: "Felipe Andrade",
    leadRole: "Analista Sênior de Vendas",
    company: "LogiMax Transportes",
    leadEmail: "f.andrade@logimax.com.br",
    leadPhone: "(19) 99541-7723",
    segment: "Logística",
    employees: 200,
    annualRevenue: 18000000,
    source: "Cold Email",
    temperature: "frio",
    note: "Não é o decisor. Mapear quem aprova compras antes do próximo contato.",
    nextAction: "Mapear decisor de compras e validar processo de aprovação.",
    followUpDate: "2026-03-20",
    expectedClose: "2026-05-20",
    value: 14000,
  },
  {
    leadName: "Isabela Fonseca",
    leadRole: "Diretora Executiva",
    company: "EduPath Cursos Online",
    leadEmail: "isabela@edupathbr.com",
    leadPhone: "(11) 94430-8861",
    segment: "Edtech",
    employees: 22,
    annualRevenue: 1100000,
    source: "Indicação",
    temperature: "em_negociacao",
    note: "Crescimento acelerado. Precisa de CRM antes de contratar novos vendedores.",
    nextAction: "Fechar proposta com plano de escala para nova equipe comercial.",
    followUpDate: "2026-03-11",
    expectedClose: "2026-03-27",
    value: 24000,
  },
  {
    leadName: "Rodrigo Sampaio",
    leadRole: "Gerente Regional",
    company: "Nutri & Vida Distribuidora",
    leadEmail: "r.sampaio@nutrievida.com.br",
    leadPhone: "(51) 98120-4467",
    segment: "Distribuidora / Alimentos",
    employees: 80,
    annualRevenue: 6700000,
    source: "Feira do Setor",
    temperature: "morno",
    note: "Interesse real, mas ciclo de venda longo. Reengajar em abril.",
    nextAction: "Programar reengajamento e plano de maturação para abril.",
    followUpDate: "2026-04-05",
    expectedClose: "2026-05-30",
    value: 19000,
  },
];

const clients = [
  { name: "Patrícia Almeida", email: "patricia.almeida@vitalcore.com.br", phone: "(11) 97311-2201", status: "ativo", tags: ["SaaS", "decisor"], lastContactDate: "2026-02-24" },
  { name: "Ricardo Nunes", email: "ricardo.nunes@primelog.com.br", phone: "(19) 98112-3344", status: "potencial", tags: ["logística"], lastContactDate: "2026-02-28" },
  { name: "Helena Pires", email: "helena.pires@clinicamaisvida.com.br", phone: "(31) 99211-6654", status: "ativo", tags: ["saúde"], lastContactDate: "2026-02-27" },
  { name: "Carlos Beretta", email: "c.beretta@argosconsult.com.br", phone: "(21) 98845-0021", status: "inativo", tags: ["consultoria"], lastContactDate: "2026-01-18" },
  { name: "Sofia Marins", email: "sofia.marins@vianet.com.br", phone: "(85) 99102-4481", status: "potencial", tags: ["telecom"], lastContactDate: "2026-02-20" },
  { name: "Fernando Lemos", email: "fernando.lemos@casanovaimoveis.com.br", phone: "(41) 99655-1001", status: "ativo", tags: ["imobiliário"], lastContactDate: "2026-02-26" },
  { name: "Daniela Prado", email: "daniela.prado@vivaschool.com.br", phone: "(11) 99700-6612", status: "potencial", tags: ["edtech"], lastContactDate: "2026-02-23" },
  { name: "Gustavo França", email: "gustavo.franca@neocargo.com.br", phone: "(51) 98142-1150", status: "ativo", tags: ["transporte"], lastContactDate: "2026-02-28" },
  { name: "Aline Couto", email: "aline.couto@nutrimed.com.br", phone: "(81) 99345-2001", status: "potencial", tags: ["saúde", "B2B"], lastContactDate: "2026-02-21" },
  { name: "Renato Farias", email: "renato.farias@omniserv.com.br", phone: "(61) 99288-3100", status: "inativo", tags: ["serviços"], lastContactDate: "2026-01-30" },
  { name: "Vanessa Braga", email: "vanessa.braga@starkengenharia.com.br", phone: "(31) 98441-7766", status: "ativo", tags: ["engenharia"], lastContactDate: "2026-02-25" },
  { name: "Marcos Teixeira", email: "marcos.teixeira@agrovale.com.br", phone: "(67) 99201-7112", status: "potencial", tags: ["agro"], lastContactDate: "2026-02-22" },
  { name: "Cláudia Reis", email: "claudia.reis@kairontech.com.br", phone: "(11) 99612-4482", status: "ativo", tags: ["tecnologia"], lastContactDate: "2026-02-28" },
  { name: "Igor Mota", email: "igor.mota@sigmaindustrial.com.br", phone: "(47) 99876-2005", status: "potencial", tags: ["indústria"], lastContactDate: "2026-02-17" },
  { name: "Bianca Borges", email: "bianca.borges@lavorovarejo.com.br", phone: "(21) 99441-8080", status: "ativo", tags: ["varejo"], lastContactDate: "2026-02-24" },
  { name: "Paulo Nery", email: "paulo.nery@elevainfra.com.br", phone: "(48) 99144-6618", status: "potencial", tags: ["infraestrutura"], lastContactDate: "2026-02-19" },
  { name: "Taís Gonçalves", email: "tais.goncalves@orionmed.com.br", phone: "(71) 99177-5422", status: "ativo", tags: ["clínicas"], lastContactDate: "2026-02-27" },
  { name: "Leandro Bueno", email: "leandro.bueno@focojuridico.com.br", phone: "(62) 99851-0041", status: "potencial", tags: ["jurídico"], lastContactDate: "2026-02-15" },
  { name: "Michele Salles", email: "michele.salles@solvpay.com.br", phone: "(11) 98202-9091", status: "ativo", tags: ["fintech"], lastContactDate: "2026-03-01" },
  { name: "Otávio Rocha", email: "otavio.rocha@portomix.com.br", phone: "(53) 99138-4410", status: "inativo", tags: ["distribuição"], lastContactDate: "2026-01-12" },
];

const upsertLead = async (lead) => {
  const { data: existing, error: findError } = await supabase
    .from("deals")
    .select("id")
    .eq("lead_email", lead.leadEmail)
    .maybeSingle();
  if (findError) throw findError;

  const payload = {
    title: `Implantação CRM - ${lead.company}`,
    company: lead.company,
    contact: lead.leadName,
    lead_name: lead.leadName,
    lead_role: lead.leadRole,
    lead_email: lead.leadEmail,
    lead_phone: lead.leadPhone,
    owner,
    value: lead.value,
    stage: "sem_contato",
    source: lead.source,
    temperature: lead.temperature,
    segment: lead.segment,
    employees: lead.employees,
    annual_revenue: lead.annualRevenue,
    next_action: lead.nextAction,
    notes: lead.note,
    follow_up_date: lead.followUpDate,
    expected_close: lead.expectedClose,
    labels: [lead.source.toLowerCase(), `temperatura:${lead.temperature}`],
    checklist_done: 0,
    checklist_total: 3,
  };

  if (existing?.id) {
    const { error } = await supabase.from("deals").update(payload).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("deals").insert(payload);
    if (error) throw error;
  }
};

const upsertClient = async (client) => {
  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("email", client.email)
    .maybeSingle();
  if (findError) throw findError;

  const payload = {
    name: client.name,
    email: client.email,
    phone: client.phone,
    status: client.status,
    tags: client.tags,
    last_contact_date: client.lastContactDate,
  };

  if (existing?.id) {
    const { error } = await supabase.from("clients").update(payload).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("clients").insert(payload);
    if (error) throw error;
  }
};

const run = async () => {
  for (const lead of leads) {
    await upsertLead(lead);
  }

  for (const client of clients) {
    await upsertClient(client);
  }

  const { count: semContatoCount, error: semContatoError } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage", "sem_contato");
  if (semContatoError) throw semContatoError;

  const { count: clientsCount, error: clientsError } = await supabase.from("clients").select("id", { count: "exact", head: true });
  if (clientsError) throw clientsError;

  console.log(`LEADS_UPSERTED:${leads.length}`);
  console.log(`CLIENTS_UPSERTED:${clients.length}`);
  console.log(`KANBAN_SEM_CONTATO_TOTAL:${semContatoCount ?? 0}`);
  console.log(`CLIENTS_TOTAL:${clientsCount ?? 0}`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`SEED_ERROR:${error.message}`);
    process.exit(1);
  });
