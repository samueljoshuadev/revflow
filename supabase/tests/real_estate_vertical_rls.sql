-- Execute after applying 202608150001_real_estate_vertical.sql.
begin;
create extension if not exists pgtap;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'real-owner-a@example.test', crypt('password-a', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'real-owner-b@example.test', crypt('password-b', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '53000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'real-viewer-a@example.test', crypt('password-c', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, vertical) values
  ('da000000-0000-0000-0000-000000000001', 'Imobiliária A', 'real-estate-a-test', 'real_estate'),
  ('db000000-0000-0000-0000-000000000002', 'Imobiliária B', 'real-estate-b-test', 'real_estate');
insert into public.organization_members (organization_id, user_id, role) values
  ('da000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'owner'),
  ('db000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'owner'),
  ('da000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000003', 'viewer');

insert into public.pipelines (id, organization_id, name, is_default) values
  ('a1000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'Pipeline A', true),
  ('b1000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'Pipeline B', true);
insert into public.pipeline_stages (
  id, organization_id, pipeline_id, name, slug, color, position, probability
) values
  ('a2000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Novo lead', 'novo-lead', '#E8A51B', 0, 5),
  ('b2000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Novo lead', 'novo-lead', '#E8A51B', 0, 5);
insert into public.leads (
  id, organization_id, pipeline_id, stage_id, name
) values
  ('a3000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'Lead A'),
  ('b3000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'Lead B');
insert into public.properties (
  id, organization_id, code, title, property_type, purpose, price, city
) values
  ('a4000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 'A-001', 'Imóvel A', 'apartment', 'sale', 450000, 'São Paulo'),
  ('b4000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002', 'B-001', 'Imóvel B', 'house', 'sale', 650000, 'Campinas');

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.properties), 1, 'owner reads only its properties');
select is((select count(*)::integer from public.properties where organization_id = 'db000000-0000-0000-0000-000000000002'), 0, 'owner cannot read another tenant property');
select lives_ok(
  $$ insert into public.properties (organization_id, code, title, property_type, purpose, price, city) values ('da000000-0000-0000-0000-000000000001', 'A-002', 'Novo imóvel A', 'house', 'rent', 3500, 'São Paulo') $$,
  'owner creates a property in its organization'
);
select throws_ok(
  $$ insert into public.properties (organization_id, code, title, property_type, purpose, price, city) values ('db000000-0000-0000-0000-000000000002', 'B-002', 'Cross tenant', 'house', 'sale', 1, 'Campinas') $$,
  '42501', null, 'owner cannot create a property in another organization'
);
select lives_ok(
  $$ insert into public.real_estate_lead_profiles (lead_id, organization_id, budget_max, preferred_city, property_type, purpose) values ('a3000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 500000, 'São Paulo', 'apartment', 'sale') $$,
  'owner records its lead profile'
);
select throws_ok(
  $$ insert into public.real_estate_lead_profiles (lead_id, organization_id) values ('b3000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'owner cannot record another tenant lead profile'
);
select throws_ok(
  $$ insert into public.property_matches (organization_id, lead_id, property_id, score, match_reason) values ('da000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000002', 90, 'cross tenant') $$,
  '23503', null, 'composite FK rejects a property from another organization'
);
select lives_ok(
  $$ update public.organizations set vertical = 'agency' where id = 'da000000-0000-0000-0000-000000000001' $$,
  'owner can update its organization vertical'
);
select results_eq(
  $$ update public.organizations set vertical = 'agency' where id = 'db000000-0000-0000-0000-000000000002' returning id $$,
  array[]::uuid[], 'owner cannot update another organization vertical'
);
select throws_ok(
  $$ insert into public.meetings (organization_id, lead_id, property_id, title, starts_at, ends_at) values ('da000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000002', 'Cross visit', now() + interval '1 day', now() + interval '1 day 1 hour') $$,
  '23503', null, 'composite FK rejects a visit with another tenant property'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('property-photos', 'organizations/da000000-0000-0000-0000-000000000001/properties/a4000000-0000-0000-0000-000000000001/photo.jpg', '51000000-0000-0000-0000-000000000001') $$,
  'owner stores a photo under its organization prefix'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('property-photos', 'organizations/db000000-0000-0000-0000-000000000002/properties/b4000000-0000-0000-0000-000000000002/photo.jpg', '51000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'storage policy rejects another tenant prefix'
);

select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$ insert into public.properties (organization_id, code, title, property_type, purpose, price, city) values ('da000000-0000-0000-0000-000000000001', 'A-003', 'Viewer write', 'house', 'sale', 1, 'São Paulo') $$,
  '42501', null, 'viewer cannot create properties'
);

select * from finish();
rollback;

