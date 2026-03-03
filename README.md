# CRM-PROJECT

CRM focado em processo de vendas, com dashboard comercial, cadastro de clientes, funil em kanban e atividades.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts

## Execucao local

```sh
npm install
npm run dev
```

## Supabase

1. Copie o arquivo `.env.example` para `.env.local`.
2. Preencha as variaveis:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL` (uso server-side apenas, nao use no frontend)
3. Cliente Supabase centralizado em `src/lib/supabase.ts`.

## Build de producao

```sh
npm run build
npm run preview
```

## Estrutura principal

- `src/components/Layout.tsx`: estrutura geral da aplicacao
- `src/pages/Dashboard.tsx`: indicadores comerciais
- `src/pages/Clients.tsx`: lista de clientes
- `src/pages/Pipeline.tsx`: funil de vendas em kanban
- `src/pages/Activities.tsx`: agenda e tarefas comerciais
