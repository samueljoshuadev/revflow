# Central de Integrações

A rota protegida `/settings/integrations` é a fonte de verdade visual para as
integrações de cada organização. `/configuracoes/integracoes` redireciona para
ela. Os cards nunca inferem conexão pela simples presença de uma variável: o
estado `connected` só é persistido depois de uma chamada real ao provedor.

## Estado entregue

- [x] Central por organização, visível para membros e editável por owner/admin.
- [x] Ajuda passo a passo, links oficiais, campos grandes e mensagens simples.
- [x] Checklist calculado por credencial, teste, webhook e sincronização reais.
- [x] Credenciais AES-256-GCM; somente ciphertext entra no PostgreSQL.
- [x] Google OAuth com `state`, PKCE, refresh token e teste do Calendar.
- [x] Criação, atualização e cancelamento de eventos Google sem bloquear a agenda interna quando o provedor falha.
- [x] OpenAI com teste real, limite mensal, Structured Outputs, validação Zod, qualificação manual/automática e avanço seguro do Kanban na mesma transação.
- [x] WhatsApp com teste real do número, verificação de webhook, assinatura do corpo bruto, limite de payload, idempotência, histórico e envio na janela de atendimento.
- [x] Calendly com Personal Access Token criptografado e teste real de conta.
- [ ] OAuth público e webhooks assinados do Calendly. Exigem um OAuth App do proprietário da plataforma; não há endpoint inseguro ou simulado.
- [ ] Testes reais com contas Google, OpenAI, Meta e Calendly.
- [ ] Homologação e deploy na Vercel.

## Preparação única da plataforma

1. Aplique `supabase/migrations/202608140002_integration_center.sql`.
2. Gere uma chave aleatória de 32 bytes e salve como `INTEGRATION_ENCRYPTION_KEY` em cada ambiente. A chave precisa permanecer estável; perdê-la impede a leitura das credenciais já cifradas.
3. Configure `SUPABASE_SERVICE_ROLE_KEY` somente no servidor. Ela é usada pelos workers de sincronização e webhooks, nunca por componentes ou pelo navegador.
4. Configure `NEXT_PUBLIC_APP_URL` com a origem exata do ambiente.

## Google Calendar

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
```

No Google Cloud, habilite Calendar API e cadastre exatamente a URI de callback. Em produção use HTTPS e o domínio real. O usuário final apenas clica em “Conectar”, autoriza sua própria conta e executa o teste final.

## OpenAI

Cada organização pode cadastrar sua própria chave pela interface. Como opção de plataforma, `OPENAI_API_KEY` funciona como fallback server-only. O modelo e o limite mensal ficam em configuração não sensível; a chave nunca é devolvida.

A análise usa a Responses API com JSON Schema estrito e ainda passa por Zod. `apply_lead_ai_analysis_and_advance` grava a análise, atualiza a projeção de `leads` e cria o evento `lead_analyzed` na mesma transação. Com score mínimo 60, a regra revisada pode avançar somente até `qualificado` em agências ou `perfil-identificado` em imobiliárias com perfil completo. A OpenAI não escolhe IDs de etapa e nunca fecha ou perde um negócio.

O teste isolado da API pode ser executado sem acessar dados reais de clientes:

```bash
npm run test:openai
```

Sem `OPENAI_API_KEY`, o comando informa `SKIP`; com a chave, realiza uma chamada
real, exige Structured Output e valida os campos essenciais sem imprimir a
credencial.

## WhatsApp Cloud API

```env
META_GRAPH_API_VERSION=
SUPABASE_SERVICE_ROLE_KEY=
INTEGRATION_ENCRYPTION_KEY=
```

Depois de salvar a integração, o card mostra uma URL exclusiva:

```text
https://DOMINIO/api/webhooks/whatsapp/CONNECTION_ID
```

Essa URL é cadastrada na Meta junto com o Verify Token definido pelo cliente. O POST exige `x-hub-signature-256`, não registra secrets e persiste no inbox apenas metadados sanitizados. Mensagens de contatos ainda não associados a um lead são reconhecidas no evento, mas não viram conversa até haver associação.

## Calendly

O modo interno usa um Personal Access Token criado na área API & Webhooks. Para distribuição pública a várias empresas, crie um OAuth App de homologação e outro de produção. A próxima feature deve adicionar OAuth 2.1 com PKCE, refresh rotation e verificação pelo Webhook Signing Key oficial.

## Diagnóstico e privacidade

- `integration_connections` guarda estado e configuração não sensível.
- `integration_credentials` guarda apenas ciphertext, IV, auth tag e dica.
- `integration_events` aceita somente diagnóstico sanitizado.
- `webhook_events` recebe somente envelope mínimo, não o payload completo do WhatsApp.
- Erros visíveis são traduzidos; códigos técnicos e diagnostic ID ficam em “Ver detalhes”.

## Validação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Depois de subir o Supabase local, execute também `supabase/tests/phase_2_rls.sql` e `supabase/tests/integration_center_rls.sql`.
