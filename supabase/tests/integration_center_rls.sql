-- Execute after applying 202608140002_integration_center.sql.
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'integration-owner-a@example.test', crypt('password-a', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '42000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'integration-owner-b@example.test', crypt('password-b', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '43000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'integration-viewer-a@example.test', crypt('password-c', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug) values
  ('ca000000-0000-0000-0000-000000000001', 'Integration A', 'integration-a-test'),
  ('cb000000-0000-0000-0000-000000000002', 'Integration B', 'integration-b-test');
insert into public.organization_members (organization_id, user_id, role) values
  ('ca000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'owner'),
  ('cb000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'owner'),
  ('ca000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003', 'viewer');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ insert into public.integration_connections (organization_id, provider, status, config) values ('ca000000-0000-0000-0000-000000000001', 'openai', 'pending', '{"model":"gpt-5.4-nano"}') $$,
  'owner configures its own integration'
);
select throws_ok(
  $$ insert into public.integration_connections (organization_id, provider, status) values ('cb000000-0000-0000-0000-000000000002', 'openai', 'pending') $$,
  '42501', null, 'owner cannot configure another tenant'
);
select throws_ok(
  $$ update public.integration_connections set config = '{"api_key":"must-not-live-here"}' where organization_id = 'ca000000-0000-0000-0000-000000000001' and provider = 'openai' $$,
  'P0001', 'sensitive integration value cannot be stored in config',
  'database rejects secrets in public configuration'
);
select lives_ok(
  $$ insert into public.integration_credentials (organization_id, provider, encrypted_payload, iv, auth_tag, secret_hint) values ('ca000000-0000-0000-0000-000000000001', 'openai', 'ciphertext', 'iv', 'tag', '••••test') $$,
  'owner stores ciphertext for its own organization'
);
select is((select count(*)::integer from public.integration_credentials), 1, 'owner reads only its own encrypted credential');

select set_config('request.jwt.claim.sub', '43000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.integration_connections), 1, 'viewer sees safe connection status for its organization');
select is((select count(*)::integer from public.integration_credentials), 0, 'viewer cannot read encrypted credentials');
select throws_ok(
  $$ insert into public.integration_connections (organization_id, provider, status) values ('ca000000-0000-0000-0000-000000000001', 'whatsapp', 'pending') $$,
  '42501', null, 'viewer cannot configure integrations'
);

select * from finish();
rollback;
