# Empreendimentos e espelho de vendas

## Modelo

Cada empreendimento é uma **conta própria**: uma `organizations` da vertical
`real_estate`, com pipeline imobiliário, RLS e isolamento completo. Um corretor
ou parceiro com acesso a vários empreendimentos é membro de várias contas e
troca entre elas pelo seletor de organização.

Dentro da conta:

- `developments` guarda o cadastro do empreendimento (nome, incorporadora,
  cidade, total de unidades, área privativa, plano de pagamento e a referência
  da tabela oficial recebida).
- `properties` guarda cada unidade do espelho, com `development_id`,
  `land_area_m2` (lote) e `unit_floor` (pavimento) somados às colunas que já
  existiam. As unidades continuam sendo imóveis normais: entram em matching,
  visitas, recomendações e no dashboard imobiliário.
- `property_sale_terms` guarda as condições comerciais tipadas de cada unidade:
  valor, R$/m², ato ou sinal, parcelas mensais, anuais, chaves e financiamento,
  com os percentuais. São colunas tipadas porque esses valores são filtrados,
  somados e exibidos em tabela.

## Migration

Aplicar depois das anteriores:

```text
supabase/migrations/202610280001_developments_and_sales_tables.sql
```

Nenhuma variável de ambiente nova.

## Importação do espelho

`import_sales_table(p_organization_id, p_development_id, p_units, p_source_reference)`
é transacional e idempotente por `(organization_id, code)`:

- cria a unidade que não existe e atualiza a que já existe;
- grava ou atualiza as condições comerciais;
- unidade **sem valor na tabela oficial** fica com status `inactive` e sem linha
  em `property_sale_terms` — nenhum preço é inventado para completar o espelho;
- atualiza `sales_table_updated_at` e grava `sales_table_imported` em
  `real_estate_events`.

Pela interface, `/developments/<slug>` aceita o JSON do espelho (até 2 MB,
validado com Zod antes de chegar ao banco). O usuário precisa de permissão de
escrita na organização; a RLS é a última barreira.

## Provisionamento das contas

O arquivo `supabase/seed/development-accounts.json` descreve as contas, o owner,
os membros e qual espelho importar. O script roda com a service role, fora de
qualquer fluxo de usuário:

```bash
node scripts/provision-development-accounts.mjs --dry-run
node scripts/provision-development-accounts.mjs
```

Sem `--send-invite`, o script exige que os usuários já existam e não envia
e-mail. Com `--send-invite`, usa o convite do Supabase Auth para quem ainda não
tem conta.

`provision_development_account` e `grant_development_account_access` são
`security definer` com `search_path` fixo e execução concedida apenas ao
`service_role`; o fluxo normal de equipe continua usando os convites da
organização.

## Espelhos recebidos

Os PDFs oficiais foram convertidos para JSON por
`scripts/sales-tables/parse-espelho.py`, que mantém a rastreabilidade entre
arquivo recebido e dado importado:

| Empreendimento | Arquivo | Unidades | Observação |
| --- | --- | --- | --- |
| Reserva do Lago Residencial | `tabela-vendas-reserva-do-lago.pdf` | 45 casas | 37 disponíveis, 8 vendidas. Plano 36x, ato 15%, financiamento 64% |
| Residencial Key West Jardim | `Catequese_Tabela_Nov_26.pdf` | 72 apartamentos | 42 com valor; 30 sem valor na tabela. Sinal 6%, 36x, 2 anuais, chaves, financiamento 70% |
| Campos de Oliveira | — | — | Espelho ainda não recebido |

Campos que não constam no arquivo recebido ficam nulos e o provisionamento falha
com mensagem explícita até serem preenchidos com o dado oficial.
