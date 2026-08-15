-- Execute after applying 202608150003_ai_kanban_automation.sql.
begin;
create extension if not exists pgtap;
select plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'ai-owner-a@example.test', crypt('password-a', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'ai-owner-b@example.test', crypt('password-b', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, vertical) values
  ('da000000-0000-0000-0000-000000000001', 'AI Agency A', 'ai-agency-a-test', 'agency'),
  ('db000000-0000-0000-0000-000000000002', 'AI Agency B', 'ai-agency-b-test', 'agency');
insert into public.organization_members (organization_id, user_id, role) values
  ('da000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'owner'),
  ('db000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'owner');
insert into public.pipelines (id, organization_id, name, is_default) values
  ('aa000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'Pipeline A', true),
  ('ab000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'Pipeline B', true);
insert into public.pipeline_stages (id, organization_id, pipeline_id, name, slug, position, probability, is_closed, is_won) values
  ('a1000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Novo lead', 'novo-lead', 0, 5, false, false),
  ('a2000000-0000-0000-0000-000000000002', 'da000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Qualificado', 'qualificado', 1, 40, false, false),
  ('a3000000-0000-0000-0000-000000000003', 'da000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Fechado', 'fechado', 2, 100, true, true),
  ('b1000000-0000-0000-0000-000000000001', 'db000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000002', 'Novo lead', 'novo-lead', 0, 5, false, false),
  ('b2000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000002', 'Qualificado', 'qualificado', 1, 40, false, false);
insert into public.leads (id, organization_id, pipeline_id, stage_id, name) values
  ('ea000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Lead permitido'),
  ('ea000000-0000-0000-0000-000000000002', 'da000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Lead etapa insegura'),
  ('eb000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Lead outro tenant');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ select public.apply_lead_ai_analysis_and_advance(
    'da000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000001',
    'gpt-5.4-nano', 'test-prompt', 'test-schema',
    '{"score":82,"priority":"high","summary":"Contexto suficiente.","next_action":"Agendar diagnóstico."}'::jsonb,
    'a2000000-0000-0000-0000-000000000002', 'Qualificação validada no teste.', 20, 10
  ) $$,
  'authorized qualification and reviewed stage move succeed atomically'
);
select is(
  (select stage_id::text from public.leads where id = 'ea000000-0000-0000-0000-000000000001'),
  'a2000000-0000-0000-0000-000000000002',
  'lead reaches only the qualified stage'
);
select is(
  (select count(*)::integer from public.ai_analyses where lead_id = 'ea000000-0000-0000-0000-000000000001'),
  1,
  'analysis is persisted'
);
select is(
  (select count(*)::integer from public.lead_events where lead_id = 'ea000000-0000-0000-0000-000000000001' and event_type = 'stage_changed' and source = 'ai'),
  1,
  'automated stage change is append-only and attributed to AI'
);
select throws_ok(
  $$ select public.apply_lead_ai_analysis_and_advance(
    'db000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000002',
    'gpt-5.4-nano', 'test-prompt', 'test-schema',
    '{"score":82,"priority":"high","summary":"Outro tenant.","next_action":"Não alterar."}'::jsonb,
    'b2000000-0000-0000-0000-000000000002', 'Tentativa cruzada.', 20, 10
  ) $$,
  'P0001', 'forbidden', 'tenant A cannot analyze or move tenant B lead'
);
select throws_ok(
  $$ select public.apply_lead_ai_analysis_and_advance(
    'da000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000002',
    'gpt-5.4-nano', 'test-prompt', 'test-schema',
    '{"score":95,"priority":"urgent","summary":"Não pode fechar.","next_action":"Revisar."}'::jsonb,
    'a3000000-0000-0000-0000-000000000003', 'Tentativa insegura.', 20, 10
  ) $$,
  'P0001', 'unsafe_automation_target', 'AI cannot close a deal'
);

select * from finish();
rollback;

