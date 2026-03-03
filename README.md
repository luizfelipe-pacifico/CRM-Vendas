# CRM-PROJECT

CRM focado em processo de vendas com:
- Dashboard comercial
- Clientes
- Funil Kanban com jornada de lead
- Atividades
- Analises com filtros
- Metas, automacoes e importacao de base

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts
- Supabase

## Execucao local

```sh
npm install
npm run dev
```

## Supabase

1. Copie `.env.example` para `.env.local`.
2. Preencha:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL` (server-side only)
3. Execute no SQL Editor:
- `supabase/schema.sql` (estrutura base)
- `supabase/migrations/20260303_crm_sales_upgrade.sql` (upgrade de leads/metas/automacoes)

Cliente Supabase: `src/lib/supabase.ts`.

## Seed de dados (teste)

Para subir os 10 leads ficticios no kanban (Sem contato) e 20 clientes ficticios:

```sh
node scripts/seed-crm-data.cjs
```

## Build e testes

```sh
npm run lint
npm test -- --run
npm run build
```

## Deploy Vercel

1. Node `22.x` (`.nvmrc` + `engines` no `package.json`)
2. Variaveis de ambiente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`

## Estrutura principal

- `src/components/Layout.tsx`: layout geral, tema e navegacao
- `src/pages/Dashboard.tsx`: visao comercial
- `src/pages/Clients.tsx`: base de clientes
- `src/pages/Pipeline.tsx`: jornada de lead, kanban, metas, automacoes e importacao
- `src/pages/Activities.tsx`: rotina comercial
- `src/pages/Analytics.tsx`: relatorios e filtros
