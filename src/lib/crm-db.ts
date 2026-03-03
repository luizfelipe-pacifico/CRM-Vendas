import { DEFAULT_CRM_SETTINGS, type CrmSettings } from "@/lib/crm-settings";
import { supabase } from "@/lib/supabase";

export type ClientStatus = "ativo" | "inativo" | "potencial";
export type DealStage =
  | "sem_contato"
  | "em_contato"
  | "diagnostico"
  | "proposta_enviada"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";
export type ActivityType = "call" | "meeting" | "email" | "followup";
export type DealTemperature = "frio" | "morno" | "quente" | "em_negociacao";
export type GoalMetric = "receita" | "negocios_ganhos" | "taxa_conversao" | "atividades";
export type AutomationAction = "create_activity" | "notify" | "tag" | "move_stage";

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  tags: string[];
  lastContactDate: string;
}

export interface DealRecord {
  id: string;
  title: string;
  company: string;
  contact: string;
  leadName: string;
  leadRole: string;
  leadEmail: string;
  leadPhone: string;
  owner: string;
  value: number;
  stage: DealStage;
  source: string;
  temperature: DealTemperature;
  segment: string;
  employees: number | null;
  annualRevenue: number | null;
  nextAction: string;
  notes: string;
  followUpDate: string;
  expectedClose: string;
  labels: string[];
  checklistDone: number;
  checklistTotal: number;
  convertedClientId: string;
}

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  title: string;
  client: string;
  date: string;
  time: string;
  done: boolean;
  responsible: string;
}

export interface GoalRecord {
  id: string;
  title: string;
  metric: GoalMetric;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate: string;
}

export interface AutomationRecord {
  id: string;
  name: string;
  triggerStage: DealStage | "";
  actionType: AutomationAction;
  actionPayload: Record<string, unknown>;
  isActive: boolean;
}

const WORKSPACE_KEY = "main";

const ensure = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const normalizeDate = (value: string | null | undefined) => value ?? "";
const normalizeTime = (value: string | null | undefined) => value?.slice(0, 5) ?? "";
const normalizeNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const fetchCrmSettings = async (): Promise<CrmSettings> => {
  const { data, error } = await supabase
    .from("crm_settings")
    .select("company_name, commercial_email, admin_name")
    .eq("workspace_key", WORKSPACE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar configurações: ${error.message}`);
  }

  if (!data) {
    return DEFAULT_CRM_SETTINGS;
  }

  return {
    companyName: data.company_name || DEFAULT_CRM_SETTINGS.companyName,
    commercialEmail: data.commercial_email || DEFAULT_CRM_SETTINGS.commercialEmail,
    adminName: data.admin_name || DEFAULT_CRM_SETTINGS.adminName,
  };
};

export const saveCrmSettings = async (settings: CrmSettings): Promise<CrmSettings> => {
  const payload = {
    workspace_key: WORKSPACE_KEY,
    company_name: settings.companyName.trim() || DEFAULT_CRM_SETTINGS.companyName,
    commercial_email: settings.commercialEmail.trim() || DEFAULT_CRM_SETTINGS.commercialEmail,
    admin_name: settings.adminName.trim() || DEFAULT_CRM_SETTINGS.adminName,
  };

  const { data, error } = await supabase
    .from("crm_settings")
    .upsert(payload, { onConflict: "workspace_key" })
    .select("company_name, commercial_email, admin_name")
    .single();

  if (error) {
    throw new Error(`Erro ao salvar configurações: ${error.message}`);
  }

  return {
    companyName: data.company_name,
    commercialEmail: data.commercial_email,
    adminName: data.admin_name,
  };
};

export const fetchClients = async (): Promise<ClientRecord[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, phone, status, tags, last_contact_date")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar clientes: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name || "",
    email: item.email || "",
    phone: item.phone || "",
    status: (item.status as ClientStatus) || "potencial",
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean).map(String) : [],
    lastContactDate: normalizeDate(item.last_contact_date),
  }));
};

export const createClient = async (payload: Omit<ClientRecord, "id">): Promise<ClientRecord> => {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: payload.name.trim(),
      email: payload.email.trim() || null,
      phone: payload.phone.trim() || null,
      status: payload.status,
      tags: payload.tags,
      last_contact_date: payload.lastContactDate || null,
    })
    .select("id, name, email, phone, status, tags, last_contact_date")
    .single();

  if (error) {
    throw new Error(`Erro ao criar cliente: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    status: (data.status as ClientStatus) || "potencial",
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).map(String) : [],
    lastContactDate: normalizeDate(data.last_contact_date),
  };
};

export const fetchDeals = async (): Promise<DealRecord[]> => {
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, title, company, contact, lead_name, lead_role, lead_email, lead_phone, owner, value, stage, source, temperature, segment, employees, annual_revenue, next_action, notes, follow_up_date, expected_close, labels, checklist_done, checklist_total, converted_client_id"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar negócios: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title || "",
    company: item.company || "",
    contact: item.contact || "",
    leadName: item.lead_name || "",
    leadRole: item.lead_role || "",
    leadEmail: item.lead_email || "",
    leadPhone: item.lead_phone || "",
    owner: item.owner || "",
    value: Number(item.value ?? 0),
    stage: (item.stage as DealStage) || "sem_contato",
    source: item.source || "",
    temperature: (item.temperature as DealTemperature) || "morno",
    segment: item.segment || "",
    employees: normalizeNumber(item.employees),
    annualRevenue: normalizeNumber(item.annual_revenue),
    nextAction: item.next_action || "",
    notes: item.notes || "",
    followUpDate: normalizeDate(item.follow_up_date),
    expectedClose: normalizeDate(item.expected_close),
    labels: Array.isArray(item.labels) ? item.labels.filter(Boolean).map(String) : [],
    checklistDone: Number(item.checklist_done ?? 0),
    checklistTotal: Number(item.checklist_total ?? 0),
    convertedClientId: item.converted_client_id || "",
  }));
};

export const createDeal = async (payload: Omit<DealRecord, "id">): Promise<DealRecord> => {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      title: payload.title.trim(),
      company: payload.company.trim(),
      contact: payload.contact.trim() || null,
      lead_name: payload.leadName.trim() || null,
      lead_role: payload.leadRole.trim() || null,
      lead_email: payload.leadEmail.trim() || null,
      lead_phone: payload.leadPhone.trim() || null,
      owner: payload.owner.trim() || null,
      value: payload.value,
      stage: payload.stage,
      source: payload.source.trim() || null,
      temperature: payload.temperature,
      segment: payload.segment.trim() || null,
      employees: payload.employees,
      annual_revenue: payload.annualRevenue,
      next_action: payload.nextAction.trim() || null,
      notes: payload.notes.trim() || null,
      follow_up_date: payload.followUpDate || null,
      expected_close: payload.expectedClose || null,
      labels: payload.labels,
      checklist_done: payload.checklistDone,
      checklist_total: payload.checklistTotal,
      converted_client_id: payload.convertedClientId || null,
    })
    .select(
      "id, title, company, contact, lead_name, lead_role, lead_email, lead_phone, owner, value, stage, source, temperature, segment, employees, annual_revenue, next_action, notes, follow_up_date, expected_close, labels, checklist_done, checklist_total, converted_client_id"
    )
    .single();

  if (error) {
    throw new Error(`Erro ao criar negócio: ${error.message}`);
  }

  return {
    id: data.id,
    title: data.title || "",
    company: data.company || "",
    contact: data.contact || "",
    leadName: data.lead_name || "",
    leadRole: data.lead_role || "",
    leadEmail: data.lead_email || "",
    leadPhone: data.lead_phone || "",
    owner: data.owner || "",
    value: Number(data.value ?? 0),
    stage: (data.stage as DealStage) || "sem_contato",
    source: data.source || "",
    temperature: (data.temperature as DealTemperature) || "morno",
    segment: data.segment || "",
    employees: normalizeNumber(data.employees),
    annualRevenue: normalizeNumber(data.annual_revenue),
    nextAction: data.next_action || "",
    notes: data.notes || "",
    followUpDate: normalizeDate(data.follow_up_date),
    expectedClose: normalizeDate(data.expected_close),
    labels: Array.isArray(data.labels) ? data.labels.filter(Boolean).map(String) : [],
    checklistDone: Number(data.checklist_done ?? 0),
    checklistTotal: Number(data.checklist_total ?? 0),
    convertedClientId: data.converted_client_id || "",
  };
};

export const updateDealStage = async (id: string, stage: DealStage): Promise<void> => {
  ensure(id, "Negócio inválido");

  const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao mover negócio: ${error.message}`);
  }
};

export const updateDeal = async (id: string, patch: Partial<Omit<DealRecord, "id">>): Promise<void> => {
  ensure(id, "Negócio inválido");

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.company !== undefined) payload.company = patch.company.trim();
  if (patch.contact !== undefined) payload.contact = patch.contact.trim() || null;
  if (patch.leadName !== undefined) payload.lead_name = patch.leadName.trim() || null;
  if (patch.leadRole !== undefined) payload.lead_role = patch.leadRole.trim() || null;
  if (patch.leadEmail !== undefined) payload.lead_email = patch.leadEmail.trim() || null;
  if (patch.leadPhone !== undefined) payload.lead_phone = patch.leadPhone.trim() || null;
  if (patch.owner !== undefined) payload.owner = patch.owner.trim() || null;
  if (patch.value !== undefined) payload.value = patch.value;
  if (patch.stage !== undefined) payload.stage = patch.stage;
  if (patch.source !== undefined) payload.source = patch.source.trim() || null;
  if (patch.temperature !== undefined) payload.temperature = patch.temperature;
  if (patch.segment !== undefined) payload.segment = patch.segment.trim() || null;
  if (patch.employees !== undefined) payload.employees = patch.employees;
  if (patch.annualRevenue !== undefined) payload.annual_revenue = patch.annualRevenue;
  if (patch.nextAction !== undefined) payload.next_action = patch.nextAction.trim() || null;
  if (patch.notes !== undefined) payload.notes = patch.notes.trim() || null;
  if (patch.followUpDate !== undefined) payload.follow_up_date = patch.followUpDate || null;
  if (patch.expectedClose !== undefined) payload.expected_close = patch.expectedClose || null;
  if (patch.labels !== undefined) payload.labels = patch.labels;
  if (patch.checklistDone !== undefined) payload.checklist_done = patch.checklistDone;
  if (patch.checklistTotal !== undefined) payload.checklist_total = patch.checklistTotal;
  if (patch.convertedClientId !== undefined) payload.converted_client_id = patch.convertedClientId || null;

  const { error } = await supabase.from("deals").update(payload).eq("id", id);
  if (error) {
    throw new Error(`Erro ao atualizar negócio: ${error.message}`);
  }
};

export const convertDealToClient = async (deal: DealRecord): Promise<ClientRecord> => {
  ensure(deal.id, "Negócio inválido");

  const normalizedEmail = deal.leadEmail.trim().toLowerCase();
  const clientName = deal.company.trim() || deal.leadName.trim() || deal.contact.trim() || deal.title.trim();

  let existingId = "";
  if (normalizedEmail) {
    const { data: existing, error: findError } = await supabase
      .from("clients")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (findError) {
      throw new Error(`Erro ao localizar cliente: ${findError.message}`);
    }
    existingId = existing?.id || "";
  }

  if (!existingId && clientName) {
    const { data: existing, error: findError } = await supabase
      .from("clients")
      .select("id")
      .eq("name", clientName)
      .maybeSingle();

    if (findError) {
      throw new Error(`Erro ao localizar cliente: ${findError.message}`);
    }
    existingId = existing?.id || "";
  }

  const tags = [
    "cliente",
    "fechado ganho",
    deal.segment ? `segmento:${deal.segment}` : "",
    deal.source ? `origem:${deal.source}` : "",
  ]
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  let client: ClientRecord;
  if (existingId) {
    const { data, error } = await supabase
      .from("clients")
      .update({
        name: clientName,
        email: normalizedEmail || null,
        phone: deal.leadPhone.trim() || null,
        status: "ativo",
        tags,
        last_contact_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", existingId)
      .select("id, name, email, phone, status, tags, last_contact_date")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar cliente convertido: ${error.message}`);
    }

    client = {
      id: data.id,
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      status: (data.status as ClientStatus) || "ativo",
      tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).map(String) : [],
      lastContactDate: normalizeDate(data.last_contact_date),
    };
  } else {
    const created = await createClient({
      name: clientName,
      email: normalizedEmail,
      phone: deal.leadPhone.trim(),
      status: "ativo",
      tags,
      lastContactDate: new Date().toISOString().slice(0, 10),
    });
    client = created;
  }

  await updateDeal(deal.id, { stage: "fechado_ganho", convertedClientId: client.id });
  return client;
};

export const fetchActivities = async (): Promise<ActivityRecord[]> => {
  const { data, error } = await supabase
    .from("activities")
    .select("id, type, title, client, activity_date, activity_time, done, responsible")
    .order("activity_date", { ascending: true, nullsFirst: false })
    .order("activity_time", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Erro ao carregar atividades: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    type: (item.type as ActivityType) || "followup",
    title: item.title || "",
    client: item.client || "",
    date: normalizeDate(item.activity_date),
    time: normalizeTime(item.activity_time),
    done: Boolean(item.done),
    responsible: item.responsible || "",
  }));
};

export const createActivity = async (payload: Omit<ActivityRecord, "id" | "done">): Promise<ActivityRecord> => {
  const { data, error } = await supabase
    .from("activities")
    .insert({
      type: payload.type,
      title: payload.title.trim(),
      client: payload.client.trim() || null,
      activity_date: payload.date || null,
      activity_time: payload.time || null,
      done: false,
      responsible: payload.responsible.trim() || null,
    })
    .select("id, type, title, client, activity_date, activity_time, done, responsible")
    .single();

  if (error) {
    throw new Error(`Erro ao criar atividade: ${error.message}`);
  }

  return {
    id: data.id,
    type: (data.type as ActivityType) || "followup",
    title: data.title || "",
    client: data.client || "",
    date: normalizeDate(data.activity_date),
    time: normalizeTime(data.activity_time),
    done: Boolean(data.done),
    responsible: data.responsible || "",
  };
};

export const updateActivityDone = async (id: string, done: boolean): Promise<void> => {
  ensure(id, "Atividade inválida");

  const { error } = await supabase.from("activities").update({ done }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao atualizar atividade: ${error.message}`);
  }
};

export const fetchGoals = async (): Promise<GoalRecord[]> => {
  const { data, error } = await supabase
    .from("goals")
    .select("id, title, metric, target_value, current_value, start_date, end_date")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar metas: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title || "",
    metric: (item.metric as GoalMetric) || "receita",
    targetValue: Number(item.target_value ?? 0),
    currentValue: Number(item.current_value ?? 0),
    startDate: normalizeDate(item.start_date),
    endDate: normalizeDate(item.end_date),
  }));
};

export const createGoal = async (payload: Omit<GoalRecord, "id">): Promise<GoalRecord> => {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      title: payload.title.trim(),
      metric: payload.metric,
      target_value: payload.targetValue,
      current_value: payload.currentValue,
      start_date: payload.startDate || null,
      end_date: payload.endDate || null,
    })
    .select("id, title, metric, target_value, current_value, start_date, end_date")
    .single();

  if (error) {
    throw new Error(`Erro ao criar meta: ${error.message}`);
  }

  return {
    id: data.id,
    title: data.title || "",
    metric: (data.metric as GoalMetric) || "receita",
    targetValue: Number(data.target_value ?? 0),
    currentValue: Number(data.current_value ?? 0),
    startDate: normalizeDate(data.start_date),
    endDate: normalizeDate(data.end_date),
  };
};

export const updateGoalProgress = async (id: string, currentValue: number): Promise<void> => {
  ensure(id, "Meta inválida");

  const { error } = await supabase.from("goals").update({ current_value: currentValue }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao atualizar meta: ${error.message}`);
  }
};

export const fetchAutomations = async (): Promise<AutomationRecord[]> => {
  const { data, error } = await supabase
    .from("automations")
    .select("id, name, trigger_stage, action_type, action_payload, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar automações: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name || "",
    triggerStage: (item.trigger_stage as DealStage) || "",
    actionType: (item.action_type as AutomationAction) || "notify",
    actionPayload: (item.action_payload as Record<string, unknown>) || {},
    isActive: Boolean(item.is_active),
  }));
};

export const createAutomation = async (payload: Omit<AutomationRecord, "id">): Promise<AutomationRecord> => {
  const { data, error } = await supabase
    .from("automations")
    .insert({
      name: payload.name.trim(),
      trigger_stage: payload.triggerStage || null,
      action_type: payload.actionType,
      action_payload: payload.actionPayload,
      is_active: payload.isActive,
    })
    .select("id, name, trigger_stage, action_type, action_payload, is_active")
    .single();

  if (error) {
    throw new Error(`Erro ao criar automação: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name || "",
    triggerStage: (data.trigger_stage as DealStage) || "",
    actionType: (data.action_type as AutomationAction) || "notify",
    actionPayload: (data.action_payload as Record<string, unknown>) || {},
    isActive: Boolean(data.is_active),
  };
};

export const updateAutomationStatus = async (id: string, isActive: boolean): Promise<void> => {
  ensure(id, "Automação inválida");

  const { error } = await supabase.from("automations").update({ is_active: isActive }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao atualizar automação: ${error.message}`);
  }
};
