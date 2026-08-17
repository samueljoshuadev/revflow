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
- [x] WhatsApp com Meta Embedded Signup, alternativa manual, teste real do número, assinatura do corpo bruto, limite de payload, idempotência, histórico e envio na janela de atendimento.
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
META_APP_ID=
META_APP_SECRET=
META_WHATSAPP_CONFIGURATION_ID=
META_GRAPH_API_VERSION=
META_WEBHOOK_VERIFY_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
INTEGRATION_ENCRYPTION_KEY=
```

### Preparação única do RevFlow na Meta

1. Crie ou use um aplicativo empresarial em Meta for Developers e adicione o
   produto WhatsApp.
2. Configure o Facebook Login for Business e crie uma configuração do WhatsApp
   Embedded Signup. Salve o Configuration ID em
   `META_WHATSAPP_CONFIGURATION_ID`.
3. Solicite as permissões necessárias para operação real, incluindo
   `whatsapp_business_management` e `whatsapp_business_messaging`, e conclua a
   verificação/revisão exigida pela Meta para atender empresas fora dos papéis
   de teste do aplicativo.
4. Cadastre o domínio de produção do RevFlow nos domínios permitidos do
   aplicativo.
5. No webhook do objeto `whatsapp_business_account`, use:

```text
Callback URL: https://DOMINIO/api/webhooks/whatsapp/meta
Verify Token: o mesmo valor de META_WEBHOOK_VERIFY_TOKEN
```

Depois dessa preparação única, owner/admin apenas clica em **Conectar com Meta e
Facebook**, entra com a conta que administra o Portfólio Empresarial, escolhe a
WABA e o número. O navegador recebe somente o código temporário e os IDs
selecionados. O servidor troca o código, comprova que o número pertence à WABA,
assina a WABA em `subscribed_apps`, criptografa a credencial e testa o número.

O webhook compartilhado valida `x-hub-signature-256` com o App Secret da
plataforma e encontra o tenant por `phone_number_id`. O payload operacional
persistido em `webhook_events` é sanitizado. Mensagens de contatos ainda não
associados a um lead são reconhecidas no evento, mas não viram conversa até
haver associação.

O modo manual continua disponível para empresas que administram um aplicativo
Meta próprio. Nesse modo, o card exibe a URL exclusiva
`/api/webhooks/whatsapp/CONNECTION_ID` e exige token, Phone Number ID, App Secret
e Verify Token.

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
