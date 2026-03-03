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

const stagePlan = [
  { email: "rafaela.duarte@lumena.com.br", stage: "sem_contato" },
  { email: "thiago.m@pioneiraeng.com.br", stage: "sem_contato" },
  { email: "camila@docearterj.com.br", stage: "em_contato" },
  { email: "leo.prates@fintrack.com.br", stage: "em_contato" },
  { email: "mariana.v@medflex.com.br", stage: "diagnostico" },
  { email: "bruno@nortexagencia.com.br", stage: "diagnostico" },
  { email: "juliana.rocha@ativoprime.com.br", stage: "proposta_enviada" },
  { email: "f.andrade@logimax.com.br", stage: "negociacao" },
  { email: "isabela@edupathbr.com", stage: "fechado_ganho" },
  { email: "r.sampaio@nutrievida.com.br", stage: "fechado_perdido" },
];

const ensureWonClient = async (deal) => {
  if (!deal) return null;

  const { data: existingClient, error: findClientError } = await supabase
    .from("clients")
    .select("id")
    .eq("email", deal.lead_email)
    .maybeSingle();

  if (findClientError) throw findClientError;
  if (existingClient?.id) return existingClient.id;

  const { data: createdClient, error: createClientError } = await supabase
    .from("clients")
    .insert({
      name: deal.company,
      email: deal.lead_email,
      phone: deal.lead_phone || null,
      status: "ativo",
      tags: ["cliente", "fechado ganho", "seed"],
      last_contact_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (createClientError) throw createClientError;
  return createdClient.id;
};

const run = async () => {
  for (const plan of stagePlan) {
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, company, lead_email, lead_phone")
      .eq("lead_email", plan.email)
      .maybeSingle();

    if (dealError) throw dealError;
    if (!deal?.id) continue;

    let convertedClientId = null;
    let convertedAt = null;
    if (plan.stage === "fechado_ganho") {
      convertedClientId = await ensureWonClient(deal);
      convertedAt = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("deals")
      .update({
        stage: plan.stage,
        converted_client_id: convertedClientId,
        converted_at: convertedAt,
      })
      .eq("id", deal.id);

    if (updateError) throw updateError;
  }

  const { data: deals, error: listError } = await supabase.from("deals").select("stage");
  if (listError) throw listError;

  const counts = {};
  for (const row of deals || []) {
    counts[row.stage] = (counts[row.stage] || 0) + 1;
  }

  console.log(`KANBAN_DISTRIBUTION:${JSON.stringify(counts)}`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`DISTRIBUTE_ERROR:${error.message}`);
    process.exit(1);
  });
