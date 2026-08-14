# AGENTS.md — Orbit CRM

## Missão

Este repositório é a fundação de um CRM multi-tenant, orientado a eventos, para agências. Preserve simplicidade, segurança, rastreabilidade e Supabase como fonte primária de dados.

## Stack e deploy

- Next.js App Router, React, TypeScript estrito e Tailwind CSS.
- Supabase Auth/PostgreSQL/RLS.
- Vercel. Não trocar a plataforma ou o framework sem decisão arquitetural explícita.
- npm e `package-lock.json` são o gerenciador/lockfile canônicos.

## Regras arquiteturais

1. UI em `components/`; casos de uso e acesso a dados em `services/`; validação nas fronteiras com Zod.
2. Prefira Server Components. Use `"use client"` somente para interação real.
3. Toda tabela de domínio pertencente a tenant carrega `organization_id` e RLS. Use FK composta para impedir referência cruzada.
4. `leads` é projeção atual; fatos ficam em `lead_events`. Mudanças relevantes precisam atualizar a projeção e criar evento na mesma transação.
5. `lead_events` é append-only. `audit_logs` é escrito por triggers/funções confiáveis.
6. Mutações críticas pertencem a funções transacionais PostgreSQL ou serviços server-only, nunca apenas a componentes.
7. Evite N+1 e consultas sem limite. Listas paginam; agregações ficam no banco.

## Segurança obrigatória

- Nunca exponha service role, webhook secret, token de integração ou credencial em código cliente ou `NEXT_PUBLIC_*`.
- Não use service role para contornar RLS em fluxos de usuário.
- Server Actions validam entrada e não confiam em IDs vindos do formulário; RLS/constraints são a última barreira.
- Funções `security definer` precisam de `search_path` fixo, checagem de autorização, grants revogados e retorno mínimo.
- Webhooks exigem corpo bruto, assinatura específica do provedor, timestamp, limite de payload, rate limit e idempotência antes de processar.
- Não renderize HTML do usuário. Não registre secrets, payloads sensíveis ou PII desnecessária em logs.
- Preserve isolamento por organização em cache, jobs, storage e realtime.

## Banco e migrations

- Nunca edite migration já aplicada em produção; crie uma nova migration incremental.
- Índices devem acompanhar padrões reais de filtro/ordenação.
- JSONB é para metadata/custom fields esparsos; dados filtrados ou agregados precisam de coluna tipada.
- Eventos usam nomes `snake_case` e fatos no passado. Documente novos contratos em `docs/events.md`.
- Atualize `types/database.ts` ao alterar o schema (idealmente substitua pelo tipo gerado pela Supabase CLI quando o projeto estiver conectado).

## Integrações e IA

- Um adaptador por provedor. SDKs não entram em componentes.
- Prompts/instruções de IA são centralizados e versionados; todo retorno passa por schema.
- Não crie endpoint público placeholder. Implemente a verificação completa no mesmo change set.

## Organização de feature

- `app/(protected)/(workspace)/<feature>`: rota e Server Actions da feature.
- `components/<feature>`: componentes visuais.
- `services/<feature>.ts` ou `services/<feature>/`: consulta e domínio reutilizável.
- `types/`: DTOs e tipos de leitura; não duplique tipos do banco sem motivo.
- `docs/`: decisão de arquitetura, contrato operacional ou fase futura.

## Checklist antes de concluir

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. Revisar RLS, autorização server-side, tenant IDs, dados expostos e consultas sem limite.
5. Atualizar documentação e `.env.example` quando houver novo contrato/configuração.

Não silencie erros para passar o build, não use `any` sem justificativa documentada e não introduza dados fictícios como fallback de produção.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
