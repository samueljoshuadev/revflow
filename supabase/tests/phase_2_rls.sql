-- Execute with `supabase test db` after linking a local/remote test project.
-- This suite is intentionally transactional and leaves no fixture data behind.
begin;
create extension if not exists pgtap;
select plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-a@example.test', crypt('password-rls-a', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner-b@example.test', crypt('password-rls-b', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer-a@example.test', crypt('password-rls-c', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug) values
  ('a0000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a-test'),
  ('b0000000-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b-test');
insert into public.organization_members (organization_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'viewer');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.organizations), 1, 'member reads only its organization');
select is((select count(*)::integer from public.organization_members), 2, 'member reads only teammates');
select results_eq(
  $$ update public.organizations set name = 'Cross tenant' where id = 'b0000000-0000-0000-0000-000000000002' returning id $$,
  array[]::uuid[], 'owner cannot update another organization'
);
select throws_ok(
  $$ update public.organization_members set role = 'admin' where organization_id = 'a0000000-0000-0000-0000-000000000001' and user_id = '10000000-0000-0000-0000-000000000001' $$,
  'P0001', 'The organization must keep at least one owner', 'last owner cannot be demoted'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select isnt(private.can_write_org('a0000000-0000-0000-0000-000000000001'), true, 'viewer has no write permission');
select is(private.is_org_member('b0000000-0000-0000-0000-000000000002'), false, 'viewer is not member of the other tenant');

select * from finish();
rollback;
