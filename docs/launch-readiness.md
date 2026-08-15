# Preparação de lançamento

## Entregue no código

- preços públicos: R$ 297 por empresa/mês e R$ 549,99 em pagamento único;
- demonstração pública sem exigir login;
- qualificação OpenAI com Responses API, Structured Outputs, Zod e limite mensal;
- avanço transacional e auditável do Kanban, limitado a etapas de qualificação;
- nenhuma movimentação automática para reunião, proposta, contrato, ganho ou perda;
- teste unitário das regras e smoke test opcional contra a API real;
- isolamento multi-tenant, RLS e eventos append-only preservados.

## Checklist obrigatório antes de receber clientes

1. Aplicar todas as migrations, inclusive
   `202608150003_ai_kanban_automation.sql`, em homologação e produção.
2. Configurar as variáveis da Vercel sem expor service role, chave de criptografia
   ou chaves de provedores no navegador.
3. Executar `npm run test:openai` em homologação com uma chave válida e um limite
   de uso definido.
4. Executar os testes SQL de RLS contra um projeto Supabase descartável.
5. Validar login, criação de organização, criação de lead, qualificação por IA,
   movimentação manual e automática, agenda e recuperação de senha.
6. Configurar monitoramento, alertas, retenção de logs e confirmar o procedimento
   de restauração de backup do Supabase.
7. Publicar termos, privacidade, política de cancelamento e definir por escrito o
   que “acesso vitalício” inclui. Custos de OpenAI, WhatsApp, Google e outros
   provedores não fazem parte do preço da plataforma.

## Limites honestos da automação

O Kanban automatizado reduz trabalho de triagem, mas não inventa acontecimentos.
Reuniões avançam após agendamento real; propostas após criação/envio real; ganho
e perda permanecem decisões humanas ou transações específicas. Essa barreira é
intencional para que os indicadores comerciais continuem confiáveis.
