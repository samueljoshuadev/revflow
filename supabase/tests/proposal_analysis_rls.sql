-- Execute after applying 202611050003_proposal_analysis.sql.
begin;
create extension if not exists pgtap;
select plan(14);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'an-owner@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '82000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'an-broker@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'an-broker2@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());
insert into public.organizations (id, name, slug, vertical) values
  ('ca000000-0000-0000-0000-000000000001', 'Incorporadora Análise', 'analysis-test', 'real_estate');
insert into public.organization_members (organization_id, user_id, role) values
  ('ca000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'owner'),
  ('ca000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 'member'),
  ('ca000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000003', 'member');
insert into public.developments (id, organization_id, name, city) values
  ('c1000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Residencial Análise', 'São Paulo');
insert into public.development_units (id, organization_id, development_id, code, list_price) values
  ('c2000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '101', 500000);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ insert into public.development_commercial_rules (development_id, organization_id, max_discount_percent, min_down_payment_percent, commission_percent, broker_share, manager_share) values ('c1000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 5, 10, 5, 60, 20) $$,
  'admin sets commercial rules'
);
select throws_ok(
  $$ update public.development_commercial_rules set partner_share = 30 where development_id = 'c1000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'commission shares cannot exceed 100%'
);

select set_config('request.jwt.claim.sub', '82000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.development_commercial_rules), 1, 'broker reads commercial rules');
update public.development_commercial_rules set commission_percent = 30;
select is((select commission_percent from public.development_commercial_rules), 5.00::numeric, 'broker cannot change commercial rules');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select 'p', public.create_property_proposal('ca000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 480000, 0, 0, 0, null, 'Comprador', '11999990000', null);
select ok(
  'payment_plan_missing' = any(public.get_proposal_missing_requirements((select id from ids))),
  'payment plan is required'
);
select throws_ok(
  $$ select public.replace_proposal_payment_plan('ca000000-0000-0000-0000-000000000001', (select id from ids), '[{"kind":"signal","installment_count":1,"installment_amount":500000,"first_due_date":"2026-12-01"}]'::jsonb) $$,
  '22023', null, 'plan cannot exceed the offered price'
);
select lives_ok(
  $$ select public.replace_proposal_payment_plan('ca000000-0000-0000-0000-000000000001', (select id from ids), '[{"kind":"signal","installment_count":1,"installment_amount":48000,"first_due_date":"2026-12-01"},{"kind":"down_payment","installment_count":4,"installment_amount":12000,"first_due_date":"2027-01-01"},{"kind":"financing","installment_count":1,"installment_amount":384000,"first_due_date":"2028-06-01"}]'::jsonb) $$,
  'broker saves the payment plan'
);
select is((select down_payment from public.property_proposals where id = (select id from ids)), 96000.00::numeric, 'down payment projection = signal + down payment installments');
select is((select financing_amount from public.property_proposals where id = (select id from ids)), 384000.00::numeric, 'financing projection follows the plan');
select ok(
  not ('payment_plan_missing' = any(public.get_proposal_missing_requirements((select id from ids))))
  and not ('payment_plan_total_mismatch' = any(public.get_proposal_missing_requirements((select id from ids)))),
  'complete plan clears plan requirements'
);
select throws_ok(
  $$ insert into public.proposal_payment_items (organization_id, proposal_id, kind, installment_count, installment_amount, first_due_date) values ('ca000000-0000-0000-0000-000000000001', (select id from ids), 'monthly', 1, 1, current_date) $$,
  '42501', null, 'payment items are written only by the RPC'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.proposal_payment_items), 0, 'other broker cannot read the plan');
select throws_ok(
  $$ select public.replace_proposal_payment_plan('ca000000-0000-0000-0000-000000000001', (select id from ids), '[]'::jsonb) $$,
  '42501', null, 'other broker cannot replace the plan'
);

-- O envio grava a cópia das regras (simulado completando o restante como superusuário).
reset role;
update public.proposal_parties set cpf = '12345678909', marital_status = 'single', income_type = 'none' where proposal_id = (select id from ids);
insert into public.proposal_documents (organization_id, proposal_id, party_id, document_type, storage_path, file_name, mime_type, size_bytes)
select 'ca000000-0000-0000-0000-000000000001', p.proposal_id, p.id, t,
       'organizations/ca000000-0000-0000-0000-000000000001/proposals/' || p.proposal_id || '/' || gen_random_uuid() || '.pdf', 'd.pdf', 'application/pdf', 10
from public.proposal_parties p, unnest(array['identity', 'civil_status_certificate', 'proof_of_residence']) t
where p.proposal_id = (select id from ids);
set local role authenticated;
select set_config('request.jwt.claim.sub', '82000000-0000-0000-0000-000000000002', true);
select public.submit_property_proposal('ca000000-0000-0000-0000-000000000001', (select id from ids));
select is(
  (select (commercial_rules_snapshot ->> 'max_discount_percent')::numeric from public.property_proposals where id = (select id from ids)),
  5.00::numeric, 'submission snapshots the commercial rules'
);

select * from finish();
rollback;
