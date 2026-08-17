# Runbook de produção

## Backup

1. Use um projeto Supabase separado para homologação.
2. Em produção, confirme backups em **Database → Backups**.
3. Faça `supabase db dump` periodicamente e guarde o arquivo cifrado fora da conta principal.
4. O backup do PostgreSQL contém metadados do Storage, mas não restaura os objetos. Exporte também os buckets usados pela organização.
5. Nunca teste restauração diretamente no projeto de produção. Restaure primeiro em homologação, aplique as variáveis daquele ambiente e valide login, RLS, leads, reuniões e anexos.

## Incidente

1. Confirme `/api/health` e o status do Supabase.
2. Na Vercel, filtre logs por erros 5xx e pelo horário do incidente.
3. Não copie payloads, tokens ou PII para tickets.
4. Registre o diagnostic ID e a rota afetada.
5. Em caso de vazamento de segredo, revogue e rotacione antes de realizar novo deploy.

## Monitoramento

- Configure um monitor HTTP externo em `https://SEU-DOMINIO/api/health`.
- Considere saudável somente HTTP 200 com `status = ok`.
- Em HTTP 503, guarde o `diagnosticId` e procure o mesmo identificador nos logs da Vercel.
- O healthcheck não retorna versão, credencial, nome de organização ou dados de clientes.

## E-mail

- Configure SMTP próprio no Supabase Auth para confirmação, convite e recuperação.
- `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL` são usados apenas nos lembretes da aplicação.
- Sem provedor, a outbox fica `blocked`; nenhuma entrega é apresentada como sucesso.

## Cron

- A Vercel chama `/api/cron/follow-ups` diariamente às 12:00 UTC.
- `CRON_SECRET` deve ser aleatório, estável e somente server-side.
- O endpoint usa claim com `skip locked`, idempotência e retry limitado.
