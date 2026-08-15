# RevFlow para Imobiliárias

## Visão geral

A vertical imobiliária utiliza o mesmo aplicativo, autenticação, banco e isolamento multi-tenant do RevFlow para Agências. A coluna `organizations.vertical` determina identidade visual, navegação, pipeline inicial e recursos disponíveis para a organização ativa.

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

## Fora do escopo desta versão

Portais de anúncios, financiamento bancário, assinatura de contratos, comissão avançada e disparos automáticos de WhatsApp não foram implementados.

