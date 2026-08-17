# Lançamento do primeiro cliente

Atualizado em: 2026-08-15

## Legenda

- `[x]` implementado e validado localmente
- `[-]` implementado, mas depende da migration ou de validação no ambiente real
- `[ ]` pendente
- `[!]` depende de credencial ou configuração externa

## Prioridade 1 — Entrada real de leads

- [-] Importação CSV com limite de 1 MB e 500 linhas.
- [-] Mapeamento de colunas e prévia antes da confirmação.
- [-] Validação server-side, normalização de telefone/e-mail e duplicidade por organização.
- [-] Batch e linhas idempotentes sem persistir o arquivo bruto.
- [-] Relatório de criados, duplicados e inválidos com download CSV.
- [-] Formulário público com honeypot, throttling e idempotência.
- [-] Webhook com Bearer token em hash, limite de payload e `Idempotency-Key`.
- [!] Aplicar `202608150005_first_client_operations.sql` no Supabase de produção.
- [ ] Validar importação e captura com dados autorizados da primeira agência.

## Prioridade 2 — Follow-ups e alertas

- [-] Regras configuráveis por organização.
- [-] Próxima ação com prazo visível no lead.
- [-] Próxima ação pode ser adiada, concluída ou cancelada com evento imutável.
- [-] Notificações internas isoladas por destinatário.
- [-] Outbox com claim concorrente, retry e confirmação real do provedor.
- [-] Cron protegido por `CRON_SECRET`.
- [-] Pausa por contato, reunião e encerramento do lead.
- [-] Conclusão/cancelamento de tarefa vinculada é registrado na timeline.
- [!] Configurar `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL` para e-mail.
- [ ] Validar entrega real e reputação do domínio remetente.

## Prioridade 3 — Kanban determinístico

- [-] Reunião agendada e concluída movimentam apenas para slugs configurados.
- [-] Proposta enviada, aceita e recusada geram evento e movimentação idempotente.
- [-] Regras podem ser pausadas por owner/admin.
- [-] Automação independente da OpenAI.
- [ ] Executar testes SQL no Supabase real depois da migration.

## Prioridade 4 — Onboarding

- [-] Checklist calculado por dados persistidos no dashboard da agência.
- [-] Links diretos para cada configuração incompleta.
- [-] Motivos de perda configuráveis.
- [ ] Validar o checklist com o processo da primeira agência.

## Prioridade 5 — Dashboard

- [x] Dados reais de leads, origens, etapas, tarefas, reuniões e vendedor.
- [ ] Adicionar filtros de período e responsável sem carregar leads no navegador.
- [ ] Acrescentar primeira resposta, ausência e motivos de perda às agregações da agência.

## Prioridade 6 — Operação

- [-] Páginas iniciais de privacidade, termos e exclusão publicadas.
- [!] Revisão jurídica dos textos antes do lançamento amplo.
- [-] Runbook de backup e restauração documentado.
- [!] Configurar SMTP próprio no Supabase Auth.
- [!] Ativar alertas e revisar logs na Vercel.
- [-] Healthcheck retorna ID de diagnóstico sem expor dados internos.
- [-] Teste SQL com 20 asserções cobre intake, RLS, notificações, tarefas e Kanban.
- [ ] Testar restauração em homologação.

## Prioridade 7 — WhatsApp

- [-] Embedded Signup preservado e modo manual disponível.
- [!] Aplicativo Meta, aprovação e credenciais pendentes.
- [x] Ausência da Meta não bloqueia CSV, formulário, agenda, follow-ups ou Kanban.

## Validação local desta entrega

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test` — 38 testes aprovados.
- [x] `npm run build` — build Next.js 16.3.1 aprovado.
- [x] `git diff --check` — sem erro de whitespace; apenas avisos de conversão LF/CRLF do Git no Windows.
- [!] Testes SQL não executados localmente: Supabase CLI, Docker e `psql` não estão instalados neste computador.
