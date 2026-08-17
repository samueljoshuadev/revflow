-- Run only against an isolated Supabase test database.
begin;
create extension if not exists pgtap;
select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'intake-a@example.test', crypt('test-a', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'intake-b@example.test', crypt('test-b', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug) values
  ('c1000000-0000-0000-0000-000000000001', 'Intake A', 'intake-a'),
  ('c2000000-0000-0000-0000-000000000002', 'Intake B', 'intake-b');
insert into public.organization_members (organization_id, user_id, role) values
  ('c1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'owner'),
  ('c2000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'owner');
insert into public.pipelines (id, organization_id, name, is_default) values
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Pipeline A', true),
  ('d2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'Pipeline B', true);
insert into public.pipeline_stages (organization_id, pipeline_id, name, slug, position) values
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Novo lead', 'novo-lead', 0),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Reunião agendada', 'reuniao-agendada', 1),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Reunião realizada', 'reuniao-realizada', 2),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Proposta', 'proposta', 3),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Fechado', 'fechado', 4),
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Perdido', 'perdido', 5),
  ('c2000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'Novo lead', 'novo-lead', 0);
update public.pipeline_stages set is_closed = true, is_won = true
where organization_id = 'c1000000-0000-0000-0000-000000000001' and slug = 'fechado';
update public.pipeline_stages set is_closed = true
where organization_id = 'c1000000-0000-0000-0000-000000000001' and slug = 'perdido';
insert into public.lead_capture_sources (
  organization_id, source_key, name, channel, source_label, token_hash, token_hint, created_by
) values
  ('c1000000-0000-0000-0000-000000000001', 'site', 'Site A', 'webhook', 'Site', extensions.digest('token-a-abcdefghijklmnopqrstuvwxyz123', 'sha256'), 'z123', '41000000-0000-0000-0000-000000000001'),
  ('c2000000-0000-0000-0000-000000000002', 'site', 'Site B', 'webhook', 'Site', extensions.digest('token-b-abcdefghijklmnopqrstuvwxyz123', 'sha256'), 'z123', '42000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.lead_capture_sources), 1, 'tenant reads only its capture source');
select results_eq(
  $$ update public.lead_capture_sources set name = 'Cross tenant' where organization_id = 'c2000000-0000-0000-0000-000000000002' returning id $$,
  array[]::uuid[], 'tenant cannot update another capture source'
);
select lives_ok(
  $$ select public.import_lead_batch(
    'c1000000-0000-0000-0000-000000000001', 'batch-0000000000000001', 'leads.csv',
    '[{"row_number":2,"name":"Lead Importado","email":"lead@example.test","phone":"11999990000","priority":"medium"}]'::jsonb
  ) $$,
  'authenticated owner imports a validated batch'
);
select is((select count(*)::integer from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001'), 1, 'first import creates one lead');
select lives_ok(
  $$ select public.import_lead_batch(
    'c1000000-0000-0000-0000-000000000001', 'batch-0000000000000001', 'leads.csv',
    '[{"row_number":2,"name":"Lead Importado","email":"lead@example.test","phone":"11999990000","priority":"medium"}]'::jsonb
  ) $$,
  'replaying the same batch is accepted'
);
select is((select count(*)::integer from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001'), 1, 'replay does not duplicate the lead');

select lives_ok(
  $$ select public.schedule_meeting(
    'c1000000-0000-0000-0000-000000000001',
    (select id from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
    '41000000-0000-0000-0000-000000000001', 'Reunião de teste',
    now() + interval '1 day', now() + interval '1 day 30 minutes',
    'America/Sao_Paulo', null, null
  ) $$,
  'meeting scheduling remains functional without AI'
);
select is(
  (select ps.slug from public.leads l join public.pipeline_stages ps on ps.id = l.stage_id
   where l.organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
  'reuniao-agendada', 'scheduled meeting moves the Kanban once'
);
select lives_ok(
  $$ select public.update_meeting_status(
    'c1000000-0000-0000-0000-000000000001',
    (select id from public.meetings where organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
    'completed', null
  ) $$,
  'meeting completion remains functional without AI'
);
select is(
  (select ps.slug from public.leads l join public.pipeline_stages ps on ps.id = l.stage_id
   where l.organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
  'reuniao-realizada', 'completed meeting moves the Kanban once'
);
select lives_ok(
  $$ insert into public.proposals (organization_id, lead_id, owner_id, title, status, sent_at)
     select organization_id, id, owner_id, 'Proposta de teste', 'sent', now()
     from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1 $$,
  'sent proposal is persisted without AI'
);
select is(
  (select ps.slug from public.leads l join public.pipeline_stages ps on ps.id = l.stage_id
   where l.organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
  'proposta', 'sent proposal moves the Kanban once'
);
select lives_ok(
  $$ update public.proposals set status = 'accepted', accepted_at = now()
     where organization_id = 'c1000000-0000-0000-0000-000000000001' $$,
  'accepted proposal is persisted without AI'
);
select is(
  (select ps.slug from public.leads l join public.pipeline_stages ps on ps.id = l.stage_id
   where l.organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
  'fechado', 'accepted proposal closes the Kanban as won'
);
insert into public.tasks (organization_id, lead_id, assignee_id, title, created_by)
select organization_id, id, owner_id, 'Retornar contato', '41000000-0000-0000-0000-000000000001'
from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1;
select lives_ok(
  $$ update public.tasks set status = 'completed', completed_at = now()
     where organization_id = 'c1000000-0000-0000-0000-000000000001' and title = 'Retornar contato' $$,
  'linked task can be completed'
);
select is(
  (select count(*)::integer from public.lead_events
   where organization_id = 'c1000000-0000-0000-0000-000000000001' and event_type = 'task_completed'),
  1, 'task completion is recorded once in the immutable timeline'
);

reset role;
insert into public.notifications (organization_id, user_id, kind, title, body, dedupe_key) values
  ('c1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'test_notice', 'Aviso A', 'Somente para o usuário A.', 'notice-a-0001'),
  ('c2000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'test_notice', 'Aviso B', 'Somente para o usuário B.', 'notice-b-0001');
set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.notifications), 1, 'recipient sees only its own notifications');
select results_eq(
  $$ update public.notifications set read_at = now()
     where organization_id = 'c2000000-0000-0000-0000-000000000002' returning id $$,
  array[]::uuid[], 'recipient cannot update another tenant notification'
);

reset role;
set local role anon;
select throws_ok(
  $$ select public.capture_external_lead('intake-a', 'site', 'webhook', 'wrong-token', 'event-000000000000001', '127.0.0.1', 'Webhook Lead', 'webhook@example.test', '', null, null, null) $$,
  'P0001', 'invalid_intake_token', 'invalid webhook token is rejected'
);
select lives_ok(
  $$ select public.capture_external_lead('intake-a', 'site', 'webhook', 'token-a-abcdefghijklmnopqrstuvwxyz123', 'event-000000000000002', '127.0.0.1', 'Webhook Lead', 'webhook@example.test', '', null, null, null) $$,
  'valid webhook token creates a lead'
);

select array_agg(t.line) as tap_output
from finish() as t(line);

reset role;
select jsonb_build_object(
  'source_a_exists', (select count(*) = 1 from public.lead_capture_sources where organization_id = 'c1000000-0000-0000-0000-000000000001'),
  'webhook_token_matches', (select encode(token_hash, 'hex') = encode(extensions.digest('token-a-abcdefghijklmnopqrstuvwxyz123', 'sha256'), 'hex') from public.lead_capture_sources where organization_id = 'c1000000-0000-0000-0000-000000000001' and source_key = 'site'),
  'source_b_unchanged', (select name = 'Site B' from public.lead_capture_sources where organization_id = 'c2000000-0000-0000-0000-000000000002' and source_key = 'site'),
  'leads_after_import_and_webhook', (select count(*) = 2 from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001'),
  'meeting_created', (select count(*) = 1 from public.meetings where organization_id = 'c1000000-0000-0000-0000-000000000001'),
  'meeting_scheduled_automation', (select count(*) = 1 from public.lead_events where organization_id = 'c1000000-0000-0000-0000-000000000001' and source = 'automation' and idempotency_key like 'meeting_scheduled:%'),
  'meeting_completed_automation', (select count(*) = 1 from public.lead_events where organization_id = 'c1000000-0000-0000-0000-000000000001' and source = 'automation' and idempotency_key like 'meeting_completed:%'),
  'proposal_created', (select count(*) = 1 from public.proposals where organization_id = 'c1000000-0000-0000-0000-000000000001'),
  'proposal_sent_event', (select count(*) = 1 from public.lead_events where organization_id = 'c1000000-0000-0000-0000-000000000001' and event_type = 'proposal_sent'),
  'proposal_accepted_event', (select count(*) = 1 from public.lead_events where organization_id = 'c1000000-0000-0000-0000-000000000001' and event_type = 'proposal_accepted'),
  'lead_closed_won', (select ps.slug = 'fechado' from public.leads l join public.pipeline_stages ps on ps.id = l.stage_id where l.organization_id = 'c1000000-0000-0000-0000-000000000001' limit 1),
  'task_completed_event', (select count(*) = 1 from public.lead_events where organization_id = 'c1000000-0000-0000-0000-000000000001' and event_type = 'task_completed'),
  'webhook_lead_count', (select count(*) from public.leads where organization_id = 'c1000000-0000-0000-0000-000000000001'),
  'webhook_event_count', (select count(*) from public.lead_events where organization_id = 'c1000000-0000-0000-0000-000000000001' and event_type = 'lead_captured'),
  'webhook_request_count', (select count(*) from private.lead_capture_requests where organization_id = 'c1000000-0000-0000-0000-000000000001')
) as diagnostics;
rollback;
