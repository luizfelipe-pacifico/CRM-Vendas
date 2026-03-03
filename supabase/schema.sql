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
  next_action text,
  follow_up_date date,
  expected_close date,
  labels text[] not null default '{}',
  checklist_done integer not null default 0 check (checklist_done >= 0),
  checklist_total integer not null default 0 check (checklist_total >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (checklist_done <= checklist_total)
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

create index if not exists idx_clients_created_at on public.clients (created_at desc);
create index if not exists idx_deals_stage on public.deals (stage);
create index if not exists idx_deals_follow_up_date on public.deals (follow_up_date);
create index if not exists idx_activities_date_time on public.activities (activity_date, activity_time);

alter table public.crm_settings enable row level security;
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;

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
