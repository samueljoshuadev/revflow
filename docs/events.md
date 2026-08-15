# Eventos de lead

## Eventos imobiliários

Os fatos `property_created`, `property_updated`, `property_deleted`, `property_recommended`, `property_match_updated`, `property_match_removed`, `real_estate_profile_created`, `real_estate_profile_updated` e `visit_rescheduled` são append-only. Eles são registrados em `lead_events`, `real_estate_events` ou em ambos, conforme a entidade afetada. Os eventos existentes de reunião continuam registrando cancelamento, conclusão e ausência.

## Contrato

Cada linha de `lead_events` contém:

- `id`, `organization_id`, `lead_id`;
- `event_type` em `snake_case`;
- `metadata` JSONB validado pelo produtor;
- `source`: `system`, `user`, `webhook`, `api`, `automation` ou `ai`;
- `actor_user_id` quando uma pessoa iniciou a ação;
- `idempotency_key` opcional para eventos externos;
- `created_at` definido pelo banco.

O stream é append-only. Correções são novos eventos, nunca alteração silenciosa do passado. A tabela `leads` continua sendo a projeção de leitura atual para performance.

## Eventos implementados e previstos

Implementados: `lead_created`, `lead_updated`, `lead_archived`, `lead_restored`,
`stage_changed`, `note_added`, `meeting_scheduled`, `meeting_cancelled`,
`meeting_completed`, `meeting_no_show`, `meeting_rescheduled`, `lead_analyzed` e
`deal_won`.

Previstos junto das integrações: `link_clicked`, `form_started`,
`form_completed`, `whatsapp_contacted`, `message_sent`,
`message_received`, `proposal_sent`, `negotiation_started` e `deal_lost`.

Novos nomes devem representar fatos no passado. Evite comandos como `send_message` e eventos genéricos como `updated`.

## Mudança manual de etapa

`move_lead_stage` registra:

```json
{
  "from_stage_id": "uuid",
  "from_stage_name": "Qualificado",
  "to_stage_id": "uuid",
  "to_stage_name": "Reunião agendada"
}
```

Usuário, timestamp e tenant ficam em colunas próprias. A mesma atualização dispara `audit_logs` com o registro anterior e o novo.

## Idempotência

Produtores internos transacionais não precisam de chave externa. Webhooks devem usar uma chave estável do provedor; o índice único `(organization_id, source, idempotency_key)` impede evento duplicado. A deduplicação do payload começa antes, em `webhook_events(provider, external_event_id)`.

`deal_won` usa `deal_won:<lead_id>`. Reservas públicas usam
`public_booking:<idempotency_key>`. Dados de contato e secrets não entram em
`metadata`.

## Evolução

Metadados de evento devem ter schema versionado no produtor quando passarem a dirigir automações. Consumidores desconhecidos ignoram campos adicionais. Mudanças incompatíveis usam nova versão ou novo `event_type`.
