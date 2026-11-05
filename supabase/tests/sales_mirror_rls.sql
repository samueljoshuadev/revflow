-- Execute after applying 202611050001_sales_mirror.sql.
begin;
create extension if not exists pgtap;
select plan(14);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'mirror-owner-a@example.test', crypt('password-a', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '62000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mirror-owner-b@example.test', crypt('password-b', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '63000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'mirror-broker-a@example.test', crypt('password-c', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, vertical) values
  ('ea000000-0000-0000-0000-000000000001', 'Incorporadora A', 'mirror-a-test', 'real_estate'),
  ('eb000000-0000-0000-0000-000000000002', 'Incorporadora B', 'mirror-b-test', 'real_estate');
insert into public.organization_members (organization_id, user_id, role) values
  ('ea000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'owner'),
  ('eb000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 'owner'),
  ('ea000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000003', 'member');

insert into public.developments (id, organization_id, name, city) values
  ('e1000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000001', 'Residencial A', 'São Paulo'),
  ('e2000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000002', 'Residencial B', 'Campinas');
insert into public.development_towers (id, organization_id, development_id, name) values
  ('e3000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Torre A'),
  ('e4000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'Torre B');
insert into public.development_units (id, organization_id, development_id, tower_id, code, floor, list_price) values
  ('e5000000-0000-0000-0000-000000000001', 'ea000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '101', 1, 450000),
  ('e6000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-000000000002', '101', 1, 550000);

-- Tower from another development cannot be attached (composite FK), even by superuser.
select throws_ok(
  $$ insert into public.development_units (organization_id, development_id, tower_id, code, list_price) values ('ea000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000002', 'X1', 1) $$,
  '23503', null, 'unit cannot reference a tower from another tenant/development'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.development_units), 1, 'owner reads only its units');
select is((select count(*)::integer from public.developments where organization_id = 'eb000000-0000-0000-0000-000000000002'), 0, 'owner cannot read another tenant development');
select lives_ok(
  $$ update public.development_units set status = 'sold' where id = 'e5000000-0000-0000-0000-000000000001' $$,
  'owner changes unit status'
);
select is(
  (select count(*)::integer from public.real_estate_events where entity_id = 'e5000000-0000-0000-0000-000000000001' and event_type = 'unit_status_changed'),
  1, 'status change records an event'
);
select is(
  (select status_changed_by::text from public.development_units where id = 'e5000000-0000-0000-0000-000000000001'),
  '61000000-0000-0000-0000-000000000001', 'status change stamps the actor'
);
select is(
  (select sold_units from public.get_developments_overview('ea000000-0000-0000-0000-000000000001')),
  1, 'overview aggregates sold units'
);
select is(
  (select count(*)::integer from public.get_developments_overview('eb000000-0000-0000-0000-000000000002')),
  0, 'overview does not leak another tenant'
);
select throws_ok(
  $$ insert into public.developments (organization_id, name, city) values ('eb000000-0000-0000-0000-000000000002', 'Cross', 'Campinas') $$,
  '42501', null, 'owner cannot create a development in another organization'
);

select set_config('request.jwt.claim.sub', '63000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.development_units), 1, 'broker reads the mirror');
select is((select count(*)::integer from public.get_developments_overview('ea000000-0000-0000-0000-000000000001')), 1, 'broker reads the overview');
select throws_ok(
  $$ insert into public.developments (organization_id, name, city) values ('ea000000-0000-0000-0000-000000000001', 'Broker dev', 'São Paulo') $$,
  '42501', null, 'broker cannot create developments'
);
update public.development_units set status = 'available' where id = 'e5000000-0000-0000-0000-000000000001';
select is(
  (select status::text from public.development_units where id = 'e5000000-0000-0000-0000-000000000001'),
  'sold', 'broker cannot change unit status'
);
select throws_ok(
  $$ insert into public.real_estate_events (organization_id, entity_type, entity_id, event_type) values ('ea000000-0000-0000-0000-000000000001', 'development_unit', 'e5000000-0000-0000-0000-000000000001', 'unit_status_changed') $$,
  '42501', null, 'unit events are written only by trusted triggers'
);

select * from finish();
rollback;
