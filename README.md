# RevFlow

CRM multi-tenant orientado a eventos para agências. Não injeta leads, métricas ou
análises fictícias: toda área operacional lê e grava no Supabase protegido por
RLS.

## Stack

- Next.js App Router, React, TypeScript estrito e Tailwind CSS
- Supabase Auth, PostgreSQL, RLS e funções transacionais
- dnd-kit para Kanban, Zod nas fronteiras e Vitest nos contratos
- Vercel como destino de deploy

## Configuração local

1. Crie um projeto Supabase.
2. Aplique todas as migrations em `supabase/migrations` na ordem do nome.
3. Autorize `http://localhost:3000/auth/callback` no Supabase Auth.
4. Copie `.env.example` para `.env.local` e preencha URL e anon key.
5. Execute:

```bash
npm install
npm run dev
```

Sem `.env.local`, o app exibe a tela de configuração. A antiga rota de preview
com dados de demonstração foi removida. Nunca use `service_role` no navegador.

## Funcionalidades

- cadastro, login, confirmação, recuperação de senha e onboarding;
- organizações, troca de workspace, equipe, convites e papéis;
- configurações, serviços, disponibilidade e link público de agenda;
- leads, busca/paginação, edição, atribuição, tags, Kanban e timeline;
- reuniões com conflito transacional, tarefas e follow-ups;
- clientes, propostas, projetos e conversão idempotente de negócio ganho;
- dashboard comercial/operacional, auditoria, health check e testes de RLS.

Integrações OpenAI, Google Calendar, Calendly e WhatsApp só são ativadas depois
que credenciais reais e verificadores oficiais estiverem configurados.

## Rotas principais

`/dashboard`, `/pipeline`, `/leads`, `/calendar`, `/tasks`, `/clients`, `/team`,
`/settings`, `/book/[organizationSlug]` e `/api/health`.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

O teste SQL `supabase/tests/phase_2_rls.sql` exige Supabase CLI/projeto de teste.

## Deploy

Crie projetos Supabase separados para homologação e produção, aplique migrations
antes da aplicação e configure as variáveis por ambiente na Vercel. Atualize a
allowlist de redirect do Auth. Este diretório ainda precisa ser iniciado como
repositório Git e conectado a ambos os serviços.

## Documentação

- [Checklist da Fase 2](docs/phase-2-checklist.md)
- [Arquitetura](docs/architecture.md)
- [Banco de dados](docs/database.md)
- [Eventos](docs/events.md)
- [Integrações](docs/integrations.md)
