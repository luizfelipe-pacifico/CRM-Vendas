# CRM Vendas (CRM-PROJECT)

Sistema CRM focado em processo comercial, criado para organizar o funil de vendas, aumentar conversão e dar visibilidade sobre operação, equipe e resultado.

## Visão geral

O projeto foi desenhado para apoiar o ciclo comercial de ponta a ponta:

- captação de leads
- qualificação no kanban
- acompanhamento de atividades
- conversão de lead em cliente
- análise de performance e melhorias do negócio

## Funcionalidades principais

- Home/Início com resumo rápido da operação
- Dashboard comercial com indicadores
- Funil de vendas em kanban com etapas reais
- Lead scoring (0-100) e temperatura de lead
- Conversão automática de lead para cliente ao fechar venda
- Base de clientes
- Atividades comerciais (follow-up, ligação, reunião, e-mail)
- Metas e automações no pipeline
- Importação de base (CSV)
- Análises com filtros (etapa, origem, responsável, temperatura, score)
- Melhorias do negócio (custos, margem, preço recomendado, insights)
- Feedback interno para sugestões e melhorias
- Tema claro/escuro/sistema

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts
- Supabase

## Requisitos

- Node.js 20.19+ (recomendado Node 22.x)
- NPM

## Execução local

```sh
npm install
npm run dev
```

## Configuração do banco (Supabase)

1. Copie `.env.example` para `.env.local`
2. Preencha:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_DB_URL` (uso server-side/scripts)
3. Execute no SQL Editor do Supabase:
   - `supabase/schema.sql`
   - `supabase/migrations/20260303_crm_sales_upgrade.sql`

Cliente Supabase: `src/lib/supabase.ts`

## Seed de dados para testes

Para subir 10 leads fictícios no kanban e 20 clientes fictícios:

```sh
node scripts/seed-crm-data.cjs
```

Para distribuir os leads em etapas diferentes da jornada:

```sh
node scripts/distribute-kanban-stages.cjs
```

## Qualidade, testes e build

```sh
npm run lint
npm test -- --run
npm run build
```

## Deploy (Vercel)

1. Use Node `22.x`
2. Configure as variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command:

```sh
npm run build
```

## Estrutura principal

- `src/components/Layout.tsx`: layout geral, navegação, tema e menu de perfil
- `src/pages/Home.tsx`: resumo inicial da operação
- `src/pages/Dashboard.tsx`: indicadores comerciais
- `src/pages/Pipeline.tsx`: kanban, metas, automações, importação e scoring
- `src/pages/Clients.tsx`: base de clientes
- `src/pages/Activities.tsx`: rotina comercial
- `src/pages/Analytics.tsx`: relatórios e filtros
- `src/pages/BusinessImprovements.tsx`: análise financeira-operacional do negócio
- `src/pages/Feedback.tsx`: melhorias e sugestões internas

## Créditos

- Idealização e direção do projeto: **Luiz Felipe Pacífico**
- Produto: **CRM Vendas**
