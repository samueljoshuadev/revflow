-- Execute after applying 202611050002_property_proposals.sql (and 202611050003 if present).
begin;
create extension if not exists pgtap;
select plan(39);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'prop-owner-a@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '72000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'prop-manager-a@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '73000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'prop-broker1-a@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '74000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'prop-broker2-a@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '75000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'prop-owner-b@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '76000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'prop-director-a@example.test', crypt('x', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, vertical) values
  ('fa000000-0000-0000-0000-000000000001', 'Incorporadora A', 'prop-a-test', 'real_estate'),
  ('fb000000-0000-0000-0000-000000000002', 'Incorporadora B', 'prop-b-test', 'real_estate');
insert into public.organization_members (organization_id, user_id, role) values
  ('fa000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'owner'),
  ('fa000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000006', 'manager'),
  ('fa000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', 'manager'),
  ('fa000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', 'member'),
  ('fa000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000004', 'member'),
  ('fb000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000005', 'owner');

insert into public.developments (id, organization_id, name, city) values
  ('f1000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'Residencial A', 'São Paulo');
insert into public.development_units (id, organization_id, development_id, code, floor, list_price) values
  ('f2000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '101', 1, 500000),
  ('f2000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '102', 1, 520000);

insert into public.pipelines (id, organization_id, name, is_default) values
  ('f3000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'Pipeline A', true);
insert into public.pipeline_stages (id, organization_id, pipeline_id, name, slug, color, position, probability) values
  ('f4000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'Novo lead', 'novo-lead', '#E8A51B', 0, 5);
insert into public.leads (id, organization_id, pipeline_id, stage_id, name, owner_id) values
  ('f5000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'Lead Três', '73000000-0000-0000-0000-000000000003');

-- Completa compradores e documentos de uma proposta (executa como o usuário atual).
create function public.test_complete_proposal(p_proposal_id uuid) returns void
language plpgsql as $$
declare v_party uuid; v_org uuid;
begin
  select id, organization_id into v_party, v_org from public.proposal_parties where proposal_id = p_proposal_id and role = 'buyer';
  update public.proposal_parties set cpf = '12345678909', marital_status = 'single', income_type = 'clt', phone = '11999990000'
  where id = v_party;
  insert into public.proposal_documents (organization_id, proposal_id, party_id, document_type, storage_path, file_name, mime_type, size_bytes, uploaded_by)
  select v_org, p_proposal_id, v_party, t,
         'organizations/' || v_org || '/proposals/' || p_proposal_id || '/' || gen_random_uuid() || '.pdf',
         t || '.pdf', 'application/pdf', 1000, auth.uid()
  from unnest(array['identity', 'civil_status_certificate', 'income_proof', 'proof_of_residence']) t;
  -- Fluxo de pagamento (fase 3): parcela única no valor ofertado.
  if to_regprocedure('public.replace_proposal_payment_plan(uuid, uuid, jsonb)') is not null then
    perform public.replace_proposal_payment_plan(v_org, p_proposal_id, jsonb_build_array(jsonb_build_object(
      'kind', 'signal', 'installment_count', 1,
      'installment_amount', (select offered_price from public.property_proposals where id = p_proposal_id),
      'first_due_date', current_date::text)));
  end if;
end $$;
grant execute on function public.test_complete_proposal(uuid) to authenticated;

set local role authenticated;

-- Hierarquia: broker1 → manager → director.
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
select lives_ok($$ select public.set_member_reports_to('fa000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000002') $$, 'admin sets broker manager');
select lives_ok($$ select public.set_member_reports_to('fa000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000006') $$, 'admin sets manager director');
select throws_ok($$ select public.set_member_reports_to('fa000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000006', '73000000-0000-0000-0000-000000000003') $$, '22023', null, 'hierarchy cycle is rejected');

-- Broker 1 cria P1 na unidade 101.
select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000003', true);
select throws_ok($$ select public.set_member_reports_to('fa000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000004', null) $$, '42501', null, 'broker cannot change hierarchy');
create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select 'p1', public.create_property_proposal('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 480000, 96000, 0, 384000, null, 'Comprador Um', '11999990000', 'um@example.test');
select is((select manager_user_id::text from public.property_proposals where id = (select id from ids where name = 'p1')), '72000000-0000-0000-0000-000000000002', 'manager snapshot comes from hierarchy');
select is((select director_user_id::text from public.property_proposals where id = (select id from ids where name = 'p1')), '76000000-0000-0000-0000-000000000006', 'director snapshot comes from hierarchy');
select is((select list_price_snapshot from public.property_proposals where id = (select id from ids where name = 'p1')), 500000::numeric, 'list price is snapshotted');
select ok(
  (public.submit_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p1')) -> 'missing') @> '["buyer_missing"]'::jsonb = false
  and jsonb_array_length(public.submit_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p1')) -> 'missing') > 0,
  'submit with pending requirements returns the missing list'
);
select is((select status from public.property_proposals where id = (select id from ids where name = 'p1')), 'draft', 'incomplete proposal stays as draft');
update public.proposal_parties set marital_status = 'married' where proposal_id = (select id from ids where name = 'p1') and role = 'buyer';
select ok('spouse_missing' = any(public.get_proposal_missing_requirements((select id from ids where name = 'p1'))), 'married buyer requires a spouse');
select lives_ok($$ select public.test_complete_proposal((select id from ids where name = 'p1')) $$, 'broker fills buyer data and documents');
select is(public.submit_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p1')) ->> 'status', 'in_review', 'first complete proposal goes to review');
select throws_ok($$ update public.property_proposals set status = 'approved' where id = (select id from ids where name = 'p1') $$, '42501', null, 'proposals cannot be updated directly');

-- Broker 2 entra na fila da mesma unidade e não vê a proposta do broker 1.
select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000004', true);
select is((select count(*)::integer from public.property_proposals), 0, 'broker does not see other brokers proposals');
select is((select count(*)::integer from public.proposal_parties), 0, 'broker does not see other buyers');
select is(public.get_unit_proposal_queue('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001') ->> 'has_active', 'true', 'queue summary shows the unit is locked');
insert into ids select 'p2', public.create_property_proposal('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 470000, 0, 0, 0, null, 'Comprador Dois', null, null);
select public.test_complete_proposal((select id from ids where name = 'p2'));
select is(public.submit_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p2')) ->> 'queue_position', '1', 'second proposal is queued');
select throws_ok($$ insert into public.proposal_parties (organization_id, proposal_id, role, full_name) values ('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p1'), 'co_buyer', 'Intruso') $$, '42501', null, 'broker cannot add parties to another proposal');
select throws_ok($$ select public.decide_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p1'), 'approved') $$, '42501', null, 'broker cannot decide proposals');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('proposal-documents', 'organizations/fa000000-0000-0000-0000-000000000001/proposals/' || (select id from ids where name = 'p1') || '/' || gen_random_uuid() || '.pdf') $$, '42501', null, 'broker cannot upload into another proposal folder');

-- Gerente e diretor veem a proposta do corretor da sua equipe.
select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.property_proposals), 1, 'manager sees only the team proposal');
select set_config('request.jwt.claim.sub', '76000000-0000-0000-0000-000000000006', true);
select is((select count(*)::integer from public.proposal_parties), 1, 'director sees the team buyer');

-- Outra organização não vê nada nem cria na unidade alheia.
select set_config('request.jwt.claim.sub', '75000000-0000-0000-0000-000000000005', true);
select is((select count(*)::integer from public.property_proposals), 0, 'other tenant sees no proposals');
select throws_ok($$ select public.create_property_proposal('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 1, 0, 0, 0, null, 'X Y', null, null) $$, '42501', null, 'other tenant cannot create proposals');

-- Admin recusa P1 → P2 sai da fila.
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.property_proposals), 2, 'admin sees every proposal');
select is(public.decide_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p1'), 'rejected', 'Valor abaixo da tabela'), 'rejected', 'admin rejects');
select is((select status from public.property_proposals where id = (select id from ids where name = 'p2')), 'in_review', 'next queued proposal is promoted');
select is((select status::text from public.development_units where id = 'f2000000-0000-0000-0000-000000000001'), 'in_proposal', 'unit stays locked for the promoted proposal');
select is((select count(*)::integer from public.notifications where user_id = '74000000-0000-0000-0000-000000000004' and kind = 'proposal_promoted'), 0, 'admin cannot read broker notifications');

-- Contraproposta vencida expira e libera a unidade.
select is(public.decide_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p2'), 'countered', 'Aceitamos 490 mil', 490000), 'countered', 'admin counters');
reset role;
update public.property_proposals set sla_due_at = now() - interval '1 minute' where id = (select id from ids where name = 'p2');
select is((public.process_proposal_deadlines(10) ->> 'expired')::integer, 1, 'overdue counter offer expires');
select is((select status::text from public.development_units where id = 'f2000000-0000-0000-0000-000000000001'), 'available', 'unit is released when the queue is empty');
select is((select count(*)::integer from public.notifications where user_id = '74000000-0000-0000-0000-000000000004' and kind in ('proposal_promoted', 'proposal_countered', 'proposal_expired')), 3, 'broker was notified of promotion, counter offer and expiry');

-- Aprovação reserva a unidade e encerra a fila.
set local role authenticated;
select set_config('request.jwt.claim.sub', '73000000-0000-0000-0000-000000000003', true);
insert into ids select 'p3', public.create_property_proposal('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002', 520000, 0, 0, 0, null, 'Comprador Três', null, null, 'f5000000-0000-0000-0000-000000000001');
select public.test_complete_proposal((select id from ids where name = 'p3'));
select public.submit_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p3'));
select set_config('request.jwt.claim.sub', '74000000-0000-0000-0000-000000000004', true);
insert into ids select 'p4', public.create_property_proposal('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002', 510000, 0, 0, 0, null, 'Comprador Quatro', null, null);
select public.test_complete_proposal((select id from ids where name = 'p4'));
select public.submit_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p4'));
insert into ids select 'p5', public.create_property_proposal('fa000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 400000, 0, 0, 0, null, 'Rascunho', null, null);
select lives_ok($$ select public.cancel_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p5'), 'Cliente desistiu') $$, 'broker cancels its draft');
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
select is(public.decide_property_proposal('fa000000-0000-0000-0000-000000000001', (select id from ids where name = 'p3'), 'approved'), 'approved', 'admin approves');
select is((select status::text from public.development_units where id = 'f2000000-0000-0000-0000-000000000002'), 'reserved', 'approval reserves the unit');
select is((select status from public.property_proposals where id = (select id from ids where name = 'p4')), 'rejected', 'queued proposals are closed after approval');

select is((select count(*)::integer from public.lead_events where lead_id = 'f5000000-0000-0000-0000-000000000001' and event_type = 'proposal_submitted'), 1, 'submission is recorded on the linked lead');
select is((select count(*)::integer from public.lead_events where lead_id = 'f5000000-0000-0000-0000-000000000001' and event_type = 'proposal_approved'), 1, 'approval is recorded on the linked lead');

select * from finish();
rollback;
