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
  owner: string;
  value: number;
  stage: DealStage;
  nextAction: string;
  followUpDate: string;
  expectedClose: string;
  labels: string[];
  checklistDone: number;
  checklistTotal: number;
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

const WORKSPACE_KEY = "main";

const ensure = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const normalizeDate = (value: string | null | undefined) => value ?? "";
const normalizeTime = (value: string | null | undefined) => value?.slice(0, 5) ?? "";

export const fetchCrmSettings = async (): Promise<CrmSettings> => {
  const { data, error } = await supabase
    .from("crm_settings")
    .select("company_name, commercial_email, admin_name")
    .eq("workspace_key", WORKSPACE_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar configuracoes: ${error.message}`);
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
    throw new Error(`Erro ao salvar configuracoes: ${error.message}`);
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
      "id, title, company, contact, owner, value, stage, next_action, follow_up_date, expected_close, labels, checklist_done, checklist_total"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar negocios: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title || "",
    company: item.company || "",
    contact: item.contact || "",
    owner: item.owner || "",
    value: Number(item.value ?? 0),
    stage: (item.stage as DealStage) || "sem_contato",
    nextAction: item.next_action || "",
    followUpDate: normalizeDate(item.follow_up_date),
    expectedClose: normalizeDate(item.expected_close),
    labels: Array.isArray(item.labels) ? item.labels.filter(Boolean).map(String) : [],
    checklistDone: Number(item.checklist_done ?? 0),
    checklistTotal: Number(item.checklist_total ?? 0),
  }));
};

export const createDeal = async (payload: Omit<DealRecord, "id">): Promise<DealRecord> => {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      title: payload.title.trim(),
      company: payload.company.trim(),
      contact: payload.contact.trim() || null,
      owner: payload.owner.trim() || null,
      value: payload.value,
      stage: payload.stage,
      next_action: payload.nextAction.trim() || null,
      follow_up_date: payload.followUpDate || null,
      expected_close: payload.expectedClose || null,
      labels: payload.labels,
      checklist_done: payload.checklistDone,
      checklist_total: payload.checklistTotal,
    })
    .select(
      "id, title, company, contact, owner, value, stage, next_action, follow_up_date, expected_close, labels, checklist_done, checklist_total"
    )
    .single();

  if (error) {
    throw new Error(`Erro ao criar negocio: ${error.message}`);
  }

  return {
    id: data.id,
    title: data.title || "",
    company: data.company || "",
    contact: data.contact || "",
    owner: data.owner || "",
    value: Number(data.value ?? 0),
    stage: (data.stage as DealStage) || "sem_contato",
    nextAction: data.next_action || "",
    followUpDate: normalizeDate(data.follow_up_date),
    expectedClose: normalizeDate(data.expected_close),
    labels: Array.isArray(data.labels) ? data.labels.filter(Boolean).map(String) : [],
    checklistDone: Number(data.checklist_done ?? 0),
    checklistTotal: Number(data.checklist_total ?? 0),
  };
};

export const updateDealStage = async (id: string, stage: DealStage): Promise<void> => {
  ensure(id, "Negocio invalido");

  const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao mover negocio: ${error.message}`);
  }
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
  ensure(id, "Atividade invalida");

  const { error } = await supabase.from("activities").update({ done }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao atualizar atividade: ${error.message}`);
  }
};
