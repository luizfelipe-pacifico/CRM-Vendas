-- CRM Sales Upgrade
-- Apply after initial schema to extend deals and add goals/automations.

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

alter table public.deals add column if not exists lead_name text;
alter table public.deals add column if not exists lead_role text;
alter table public.deals add column if not exists lead_email text;
alter table public.deals add column if not exists lead_phone text;
alter table public.deals add column if not exists source text;
alter table public.deals add column if not exists temperature text;
alter table public.deals add column if not exists segment text;
alter table public.deals add column if not exists employees integer;
alter table public.deals add column if not exists annual_revenue numeric(14,2);
alter table public.deals add column if not exists notes text;
alter table public.deals add column if not exists converted_client_id uuid;
alter table public.deals add column if not exists converted_at timestamptz;

alter table public.deals alter column temperature set default 'morno';
update public.deals set temperature = 'morno' where temperature is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_temperature_check'
  ) then
    alter table public.deals
      add constraint deals_temperature_check check (temperature in ('frio', 'morno', 'quente', 'em_negociacao'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_converted_client_id_fkey'
  ) then
    alter table public.deals
      add constraint deals_converted_client_id_fkey
      foreign key (converted_client_id) references public.clients(id);
  end if;
end $$;

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

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_automations_updated_at on public.automations;
create trigger trg_automations_updated_at
before update on public.automations
for each row execute function public.set_updated_at();

create index if not exists idx_deals_temperature on public.deals (temperature);
create index if not exists idx_deals_source on public.deals (source);
create index if not exists idx_goals_metric on public.goals (metric);
create index if not exists idx_automations_active on public.automations (is_active);

alter table public.goals enable row level security;
alter table public.automations enable row level security;

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
