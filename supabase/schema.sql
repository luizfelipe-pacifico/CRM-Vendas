-- CRM Project - Supabase schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.crm_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null unique,
  company_name text not null,
  commercial_email text not null,
  admin_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  email text,
  phone text,
  status text not null default 'potencial' check (status in ('ativo', 'inativo', 'potencial')),
  tags text[] not null default '{}',
  last_contact_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  company text not null check (length(trim(company)) > 0),
  contact text,
  lead_name text,
  lead_role text,
  lead_email text,
  lead_phone text,
  owner text,
  value numeric(14,2) not null default 0 check (value >= 0),
  stage text not null default 'sem_contato' check (
    stage in (
      'sem_contato',
      'em_contato',
      'diagnostico',
      'proposta_enviada',
      'negociacao',
      'fechado_ganho',
      'fechado_perdido'
    )
  ),
  source text,
  temperature text not null default 'morno' check (temperature in ('frio', 'morno', 'quente', 'em_negociacao')),
  segment text,
  employees integer check (employees >= 0),
  annual_revenue numeric(14,2) check (annual_revenue >= 0),
  next_action text,
  notes text,
  follow_up_date date,
  expected_close date,
  labels text[] not null default '{}',
  checklist_done integer not null default 0 check (checklist_done >= 0),
  checklist_total integer not null default 0 check (checklist_total >= 0),
  converted_client_id uuid references public.clients(id),
  converted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (checklist_done <= checklist_total)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  metric text not null check (metric in ('receita', 'negocios_ganhos', 'taxa_conversao', 'atividades')),
  target_value numeric(14,2) not null default 0 check (target_value >= 0),
  current_value numeric(14,2) not null default 0 check (current_value >= 0),
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  trigger_stage text check (
    trigger_stage in (
      'sem_contato',
      'em_contato',
      'diagnostico',
      'proposta_enviada',
      'negociacao',
      'fechado_ganho',
      'fechado_perdido'
    )
  ),
  action_type text not null check (action_type in ('create_activity', 'notify', 'tag', 'move_stage')),
  action_payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'followup' check (type in ('call', 'meeting', 'email', 'followup')),
  title text not null check (length(trim(title)) > 0),
  client text,
  activity_date date,
  activity_time time,
  done boolean not null default false,
  responsible text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_crm_settings_updated_at on public.crm_settings;
create trigger trg_crm_settings_updated_at
before update on public.crm_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

drop trigger if exists trg_activities_updated_at on public.activities;
create trigger trg_activities_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_automations_updated_at on public.automations;
create trigger trg_automations_updated_at
before update on public.automations
for each row execute function public.set_updated_at();

create index if not exists idx_clients_created_at on public.clients (created_at desc);
create index if not exists idx_deals_stage on public.deals (stage);
create index if not exists idx_deals_follow_up_date on public.deals (follow_up_date);
create index if not exists idx_deals_temperature on public.deals (temperature);
create index if not exists idx_deals_source on public.deals (source);
create index if not exists idx_activities_date_time on public.activities (activity_date, activity_time);
create index if not exists idx_goals_metric on public.goals (metric);
create index if not exists idx_automations_active on public.automations (is_active);

alter table public.crm_settings enable row level security;
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;
alter table public.goals enable row level security;
alter table public.automations enable row level security;

drop policy if exists "crm_settings_select_all" on public.crm_settings;
create policy "crm_settings_select_all"
on public.crm_settings
for select
to anon, authenticated
using (true);

drop policy if exists "crm_settings_insert_all" on public.crm_settings;
create policy "crm_settings_insert_all"
on public.crm_settings
for insert
to anon, authenticated
with check (true);

drop policy if exists "crm_settings_update_all" on public.crm_settings;
create policy "crm_settings_update_all"
on public.crm_settings
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "clients_select_all" on public.clients;
create policy "clients_select_all"
on public.clients
for select
to anon, authenticated
using (true);

drop policy if exists "clients_insert_all" on public.clients;
create policy "clients_insert_all"
on public.clients
for insert
to anon, authenticated
with check (true);

drop policy if exists "clients_update_all" on public.clients;
create policy "clients_update_all"
on public.clients
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "deals_select_all" on public.deals;
create policy "deals_select_all"
on public.deals
for select
to anon, authenticated
using (true);

drop policy if exists "deals_insert_all" on public.deals;
create policy "deals_insert_all"
on public.deals
for insert
to anon, authenticated
with check (true);

drop policy if exists "deals_update_all" on public.deals;
create policy "deals_update_all"
on public.deals
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "activities_select_all" on public.activities;
create policy "activities_select_all"
on public.activities
for select
to anon, authenticated
using (true);

drop policy if exists "activities_insert_all" on public.activities;
create policy "activities_insert_all"
on public.activities
for insert
to anon, authenticated
with check (true);

drop policy if exists "activities_update_all" on public.activities;
create policy "activities_update_all"
on public.activities
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "goals_select_all" on public.goals;
create policy "goals_select_all"
on public.goals
for select
to anon, authenticated
using (true);

drop policy if exists "goals_insert_all" on public.goals;
create policy "goals_insert_all"
on public.goals
for insert
to anon, authenticated
with check (true);

drop policy if exists "goals_update_all" on public.goals;
create policy "goals_update_all"
on public.goals
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "automations_select_all" on public.automations;
create policy "automations_select_all"
on public.automations
for select
to anon, authenticated
using (true);

drop policy if exists "automations_insert_all" on public.automations;
create policy "automations_insert_all"
on public.automations
for insert
to anon, authenticated
with check (true);

drop policy if exists "automations_update_all" on public.automations;
create policy "automations_update_all"
on public.automations
for update
to anon, authenticated
using (true)
with check (true);
