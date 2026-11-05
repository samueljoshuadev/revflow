# Loovimob

## Visão geral

O Loovimob atende somente imobiliárias e incorporadoras; a vertical de agências foi removida da interface. A coluna `organizations.vertical` determina identidade visual, navegação, pipeline inicial e recursos disponíveis para a organização ativa.

- `agency`: experiência existente, roxa.
- `real_estate`: experiência âmbar, imóveis, visitas, matching e relatórios imobiliários.

As páginas públicas `/`, `/agencias` e `/imobiliarias` não dependem da vertical da organização e não foram alteradas por esta feature.

## Aplicação da migration

Aplicar uma única vez, depois das migrations anteriores:

```text
supabase/migrations/202608150001_real_estate_vertical.sql
```

A migration preserva organizações existentes como `agency`, cria os tipos e tabelas imobiliários, adiciona a associação opcional de imóvel em `meetings`, configura o bucket privado `property-photos` e instala políticas RLS.

Não há nova variável de ambiente. As configurações atuais do Supabase continuam sendo utilizadas.

## Onboarding

O onboarding chama `create_organization_with_vertical`. Para `agency`, a função delega ao provisionamento anterior. Para `real_estate`, cria o pipeline:

1. Novo lead
2. Perfil identificado
3. Imóveis recomendados
4. Visita agendada
5. Visita realizada
6. Documentação / crédito
7. Proposta
8. Contrato
9. Fechado ganho
10. Fechado perdido

Nenhum lead, imóvel ou métrica fictícia é criado.

## Imóveis e fotos

Os imóveis são armazenados em `properties`; metadados das fotos ficam em `property_photos`. Os objetos são privados no bucket `property-photos`, no caminho:

```text
organizations/{organization_id}/properties/{property_id}/{uuid}.{ext}
```

Somente JPG, PNG e WebP, com limite de 5 MB, são aceitos. A leitura usa URLs assinadas com validade curta.

## Perfil e matching

`real_estate_lead_profiles` guarda preferências tipadas. O matching é determinístico e funciona sem OpenAI, considerando orçamento, localização, finalidade, tipo e quartos mínimos. Uma recomendação somente é persistida depois de ser recalculada no servidor.

## Visitas

Visitas reutilizam `meetings`, com `property_id` opcional e FK composta por organização. O agendamento e o reagendamento reutilizam a integração existente com Google Calendar. Alterações importantes geram eventos append-only no lead e em `real_estate_events`.

## Teste manual com duas organizações

1. Crie uma organização do tipo Imobiliária e outra do tipo Agência.
2. Confirme que a agência mantém logo, cores e navegação roxas.
3. Na imobiliária, cadastre um imóvel real e envie uma foto.
4. Cadastre um lead e preencha seu perfil imobiliário.
5. Registre uma recomendação determinística.
6. Agende uma visita associando lead e imóvel.
7. Troque para a outra organização e confirme que imóvel, foto, matching e visita não aparecem.
8. Execute `supabase test db` em um projeto de teste para validar `supabase/tests/real_estate_vertical_rls.sql`.

## Espelho de vendas (empreendimentos)

Migration: `supabase/migrations/202611050001_sales_mirror.sql`.

- `developments`: empreendimento, incorporadora, fase, localização e regras do simulador (`financing_annual_rate`, `financing_max_term_months`, `financing_max_ltv`, `income_commitment_limit`). Taxa nula significa "não configurada": o simulador pede a taxa ao corretor em vez de usar um valor inventado.
- `development_towers`: blocos/torres/quadras (opcional).
- `development_units`: unidade com código, andar, posição, tipologia, área, preço de tabela e status (`available`, `in_proposal`, `reserved`, `sold`, `rented`, `blocked`). FKs compostas garantem a mesma organização e que o bloco pertence ao mesmo empreendimento.
- `get_developments_overview(org)`: contagem por status e VGV agregados no banco, sob RLS do chamador.

Permissões: todos os membros leem o espelho; somente `owner`/`admin` criam, editam e mudam status manualmente (RLS com `private.is_org_admin` + checagem nas Server Actions). Unidade em `in_proposal` não muda manualmente.

Telas:

- `/developments`: lista com unidades, % vendido e VGV.
- `/developments/[id]`: grade do espelho por bloco e andar. Clicar numa unidade abre o painel com status, dados, simulador de financiamento (SAC/Price, FGTS, renda mínima, LTV) e, para admins, edição de status/preço.
- `/developments/[id]/settings`: blocos, geração de unidades em lote (até 2.000 por vez), unidade avulsa e regras do simulador.

O simulador (`lib/financing.ts`) é uma estimativa sem seguros, taxas e TR; não substitui a análise de crédito.

## Propostas por unidade

Migration: `supabase/migrations/202611050002_property_proposals.sql`.

Fluxo: unidade no espelho → **Criar proposta** (rascunho com comprador e valores) → dados dos participantes e documentos → **Enviar para análise** → incorporadora aprova, recusa ou faz contraproposta.

- **Fila**: a primeira proposta enviada trava a unidade (`in_review`, unidade `in_proposal`). As seguintes ficam `queued` com posição. Recusa, cancelamento ou expiração promovem a próxima automaticamente; sem fila, a unidade volta a `available`. Aprovação reserva a unidade e encerra a fila. Índice único parcial garante uma só proposta ativa por unidade, e o envio trava a linha da unidade (`for update`).
- **Pendências**: `get_proposal_missing_requirements` é a fonte única das exigências (tela e envio). Por participante: CPF, estado civil, tipo de renda, RG/CNH, certidão conforme estado civil, comprovante de renda (se houver renda); do comprador também telefone e comprovante de residência. Comprador casado/união estável exige cônjuge.
- **Visibilidade**: owner/admin veem e decidem todas. Corretor vê as suas; gerente e diretor veem as vinculadas a eles. O vínculo vem da hierarquia (`organization_members.reports_to_user_id`, editada em Corretores → Hierarquia comercial) e é gravado na proposta no momento da criação. Qualquer membro vê apenas a contagem da fila (`get_unit_proposal_queue`), sem identificar corretores.
- **Escrita**: `property_proposals` só muda pelas funções `create/update_terms/submit/decide/cancel`. Compradores e documentos têm RLS de edição apenas em rascunho ou contraproposta.
- **Documentos**: bucket privado `proposal-documents`, caminho `organizations/{org}/proposals/{proposal}/{uuid}.{ext}`, PDF/JPG/PNG/WebP de até 4 MB (tipo conferido pela assinatura binária), URLs assinadas de 10 minutos.
- **Prazo**: `organizations.proposal_sla_hours` (padrão 48, em Configurações). O cron (`/api/cron/follow-ups`) chama `process_proposal_deadlines`: proposta em análise vencida gera aviso único para admins e equipe; contraproposta sem resposta no prazo expira e libera a unidade.
- **Notificações**: in-app (e e-mail pelo outbox existente) para admins (nova proposta) e corretor/gerente/diretor (fila, aprovação, recusa, contraproposta, expiração). `notifications.action_path` leva direto à proposta.
- **Imobiliárias parceiras**: `partner_agencies` (Corretores → Imobiliárias parceiras) e campos de corretor externo na proposta.

## Analisador de proposta e comissão

Migration: `supabase/migrations/202611050003_proposal_analysis.sql`.

- **Regras comerciais** por empreendimento (`development_commercial_rules`, editadas em Empreendimento → Configurar): desconto máximo, entrada mínima, máximo de parcelas da entrada, mínimo pago até as chaves, taxa mensal para valor presente, comissão total, divisão entre corretor/gerente/diretor/imobiliária (soma ≤ 100%) e regra de pagamento da comissão (`upfront` ou `with_down_payment`, com limite opcional de parcelas). Escrita só owner/admin.
- **Fluxo de pagamento** (`proposal_payment_items`): sinal, entrada parcelada, mensais, intermediárias, chaves, FGTS e financiamento, com quantidade, valor, 1º vencimento e intervalo. Só muda por `replace_proposal_payment_plan`, que também atualiza a projeção `down_payment`/`fgts_amount`/`financing_amount` da proposta. O fluxo é obrigatório e precisa somar exatamente o valor ofertado para enviar (novas pendências `payment_plan_missing` e `payment_plan_total_mismatch`).
- **Cópia das regras no envio**: trigger grava `commercial_rules_snapshot` e `analysis_reference_date` quando a proposta entra em análise ou na fila (e no reenvio). A análise de propostas enviadas usa essa cópia; rascunhos usam as regras atuais.
- **Analisador** (`lib/proposal-analysis.ts`): desconto sobre a tabela, entrada (% e parcelas), % pago até as chaves (fluxo próprio vencido até a entrega + chaves), valor presente e desconto efetivo, impacto no VGV do empreendimento. Veredito: boa proposta, atenção, fora das regras ou sem regras.
- **Comissão**: total sobre o valor vendido, divisão por papel (papel sem vínculo na proposta fica "não alocado") e parcelas. Em `with_down_payment`, a comissão acompanha cada pagamento de sinal/entrada; com limite de parcelas, os recebimentos são agrupados e cada parcela da comissão vence junto do último recebimento do grupo (nunca antes de o cliente pagar).

Próximas fases: contrato gerado na aprovação, aviso por WhatsApp personalizável e autorização LGPD com entrevista.

## Fora do escopo desta versão

Portais de anúncios, financiamento bancário, assinatura de contratos, comissão avançada e disparos automáticos de WhatsApp não foram implementados.

