-- Execute after 202608150002_reliability_security_and_commercial.sql.
begin;
create extension if not exists pgtap;
select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'reliability-owner@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '62000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'reliability-admin@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '63000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'reliability-viewer@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '64000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'reliability-outsider@example.test', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug) values
  ('d1000000-0000-0000-0000-000000000001', 'Reliability Test', 'reliability-test');
insert into public.organization_members (organization_id, user_id, role) values
  ('d1000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'owner'),
  ('d1000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', 'admin'),
  ('d1000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'viewer');
insert into public.pipelines (id, organization_id, name, is_default) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Pipeline', true);
insert into public.pipeline_stages (id, organization_id, pipeline_id, name, slug, position, probability) values
  ('d3000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'Novo', 'novo', 0, 0);
insert into public.leads (id, organization_id, pipeline_id, stage_id, name) values
  ('d4000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'Lead reliability');
insert into public.clients (id, organization_id, name) values
  ('d5000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Cliente reliability');
insert into public.proposals (id, organization_id, client_id, title) values
  ('d6000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'Proposta reliability');
insert into public.conversations (id, organization_id, lead_id, external_contact_id) values
  ('d7000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', '5511999999999');
insert into public.messages (organization_id, conversation_id, direction, status, body, sent_at) values
  ('d1000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'inbound', 'received', 'Olá', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ insert into public.meetings (organization_id, lead_id, owner_id, title, starts_at, ends_at) values
       ('d1000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'Reunião 1', now() + interval '1 day', now() + interval '1 day 1 hour'),
       ('d1000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'Reunião 2', now() + interval '2 days', now() + interval '2 days 1 hour') $$,
  'two manual meetings are allowed'
);
select lives_ok(
  $$ insert into public.clients (organization_id, name) values
       ('d1000000-0000-0000-0000-000000000001', 'Cliente manual 1'),
       ('d1000000-0000-0000-0000-000000000001', 'Cliente manual 2') $$,
  'two manual clients are allowed'
);
select lives_ok(
  $$ insert into public.projects (organization_id, client_id, name) values
       ('d1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'Projeto manual 1'),
       ('d1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'Projeto manual 2') $$,
  'two manual projects are allowed'
);
select throws_ok(
  $$ insert into public.projects (organization_id, client_id, proposal_id, name) values
       ('d1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001', 'Projeto da proposta 1'),
       ('d1000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001', 'Projeto da proposta 2') $$,
  '23505', null, 'a proposal still has only one project'
);
select lives_ok(
  $$ select public.queue_whatsapp_outbound_message('d1000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'Mensagem 1');
     select public.queue_whatsapp_outbound_message('d1000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'Mensagem 2') $$,
  'two outbound messages without provider IDs are allowed'
);
select lives_ok(
  $$ select public.update_organization_member_role('d1000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'member') $$,
  'owner can change another member role'
);

select set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.update_organization_member_role('d1000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000002', 'owner') $$,
  'P0001', 'You cannot change your own role', 'admin cannot promote themselves'
);
select throws_ok(
  $$ select public.remove_organization_member('d1000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001') $$,
  'P0001', 'Only an owner can remove an owner', 'admin cannot remove an owner'
);

select set_config('request.jwt.claim.sub', '63000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$ select public.queue_whatsapp_outbound_message('d1000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'Viewer não envia') $$,
  'P0001', 'Access denied', 'viewer cannot queue WhatsApp messages'
);

select set_config('request.jwt.claim.sub', '64000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$ select public.update_organization_member_role('d1000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'admin') $$,
  'P0001', 'Access denied', 'an outsider cannot call the membership RPC directly'
);

select * from finish();
rollback;
