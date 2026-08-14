# Fase 2 — CRM operacional

Atualizado em: 2026-08-14

## Legenda

- `[ ]` pendente
- `[-]` em implementação ou implementado sem validação no ambiente real
- `[x]` concluído e validado
- `[!]` bloqueado por credencial, acesso ou infraestrutura externa

## Preparação e diagnóstico

- [x] Ler `AGENTS.md`, documentação, estrutura atual e migrations existentes.
- [x] Verificar arquivos de ambiente sem imprimir valores sensíveis.
- [x] Confirmar que não há `.env.local` nem variáveis Supabase configuradas.
- [x] Confirmar que Supabase CLI, Vercel CLI e Docker não estão instalados.
- [x] Confirmar que a pasta ainda não é um repositório Git e não está vinculada à Vercel.
- [x] Inicializar repositório Git local na branch `main`.
- [x] Preservar a migration inicial e trabalhar apenas com migrations incrementais.

## Autenticação e organizações

- [-] Login real com Supabase Auth e sessão validada no servidor.
- [-] Cadastro, confirmação de e-mail, recuperação e redefinição de senha.
- [x] Logout e proteção server-side das rotas privadas.
- [x] Onboarding que cria organização, pipeline e etapas na mesma RPC.
- [-] Configurações persistidas da organização, disponibilidade, serviços e notificações.
- [-] Troca de organização com cookie HTTP-only validado no servidor.
- [-] Gestão de membros, convites por token com hash e permissões por função.
- [-] Impedir remoção ou rebaixamento do último proprietário por trigger.
- [!] Validar os fluxos contra Supabase real — faltam URL e chave pública do projeto.

## Leads e processo comercial

- [x] Listagem paginada, busca, prioridade, detalhe e pipeline Kanban persistidos.
- [x] Criação de lead e movimentação transacional com histórico em `lead_events`.
- [x] Notas, timeline, origem, campanha, score, orçamento e próxima ação.
- [-] Editar, arquivar e excluir lead com auditoria.
- [-] Atribuir lead a vendedor e gerenciar tags.
- [ ] Filtros adicionais por etapa, responsável, origem e período.
- [-] Qualificação humana por score; IA permanece bloqueada sem credencial.

## Agenda, tarefas e automações

- [-] Agenda persistida com criar, cancelar e concluir reunião; edição ainda pendente.
- [-] Lista cronológica e proteção transacional contra conflitos; visões diária/semanal pendentes.
- [-] Página pública `/book/[organizationSlug]` com horário comercial, conflito, honeypot, throttling e idempotência.
- [-] Follow-ups e tarefas atribuíveis, com estados e vencimentos; disparo de lembretes pendente.
- [ ] Confirmações e lembretes automáticos processados de forma idempotente.

## Integrações

- [!] OpenAI — falta `OPENAI_API_KEY`; interface deve indicar “não configurada”.
- [!] Google Calendar — faltam credenciais OAuth e projeto Google.
- [!] Calendly — faltam token e segredo de webhook.
- [!] WhatsApp Cloud API — faltam token, phone number ID e segredo de webhook.
- [ ] Webhooks com assinatura, timestamp, limite de payload, rate limit e idempotência.
- [x] Contrato de conexões armazena referência server-only e não expõe tokens no cliente/logs.
- [-] Central do WhatsApp lê histórico real e informa integração não configurada, sem mensagens simuladas.

## Clientes e pós-venda

- [-] Clientes derivados de negócio ganho de forma idempotente e cadastro manual.
- [-] Propostas com valores, estados e validade; edição de itens ainda pendente.
- [-] Projetos e tarefas de entrega persistidos; visão detalhada ainda pendente.
- [-] Conversão `deal_won` transacional e rastreável.

## Segurança, qualidade e operação

- [x] RLS e `organization_id` nas tabelas de domínio atuais.
- [x] Eventos append-only e trilha de auditoria inicial.
- [-] RLS e FKs compostas para todas as tabelas novas, aguardando aplicação no Supabase.
- [-] Suite SQL de isolamento criada; execução bloqueada sem Supabase CLI/projeto de teste.
- [x] Testes automatizados de contratos de data, IA estruturada e provedores de webhook.
- [x] Validação Zod nas novas ações e retornos de fronteira.
- [-] Throttling da reserva pública, health check, logs sanitizados e tela de erro segura.
- [ ] Política de retenção, exportação e exclusão para LGPD.
- [!] Backup e restore testado — exige projeto Supabase real e acesso ao painel.
- [!] Homologação e deploy Vercel — exigem projetos Supabase/Vercel e autenticação.

## Validação final

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` (4 testes aprovados)
- [x] `npm run build`
- [ ] Testar fluxo cadastro → organização → lead → reunião → tarefa → negócio ganho.
- [!] Validar com dados e processo comercial reais da agência — depende do ambiente conectado.
