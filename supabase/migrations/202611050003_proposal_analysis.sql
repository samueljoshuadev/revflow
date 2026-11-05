-- Fase 3: regras comerciais da incorporadora, fluxo de pagamento da proposta
-- e base para o analisador de proposta e o cálculo de comissão.
--
-- O analisador e a comissão são calculados de forma determinística em
-- lib/proposal-analysis.ts a partir de dados confiáveis do banco: o fluxo
-- (proposal_payment_items) e a cópia das regras gravada no envio
-- (property_proposals.commercial_rules_snapshot). Nada vem do cliente.

create table public.development_commercial_rules (
  development_id uuid primary key,
  -- Identificador próprio exigido pela auditoria genérica (audit_domain_change).
  id uuid not null default gen_random_uuid() unique,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  max_discount_percent numeric(5, 2) check (max_discount_percent is null or max_discount_percent between 0 and 100),
  min_down_payment_percent numeric(5, 2) check (min_down_payment_percent is null or min_down_payment_percent between 0 and 100),
  max_down_payment_installments smallint check (max_down_payment_installments is null or max_down_payment_installments between 1 and 120),
  min_paid_until_keys_percent numeric(5, 2) check (min_paid_until_keys_percent is null or min_paid_until_keys_percent between 0 and 100),
  present_value_monthly_rate numeric(6, 4) check (present_value_monthly_rate is null or present_value_monthly_rate between 0 and 10),
  commission_percent numeric(5, 2) check (commission_percent is null or commission_percent between 0 and 30),
  broker_share numeric(5, 2) not null default 0 check (broker_share between 0 and 100),
  manager_share numeric(5, 2) not null default 0 check (manager_share between 0 and 100),
  director_share numeric(5, 2) not null default 0 check (director_share between 0 and 100),
  partner_share numeric(5, 2) not null default 0 check (partner_share between 0 and 100),
  commission_payment_rule text not null default 'with_down_payment'
    check (commission_payment_rule in ('upfront', 'with_down_payment')),
  commission_max_installments smallint check (commission_max_installments is null or commission_max_installments between 1 and 120),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (development_id, organization_id)
    references public.developments(id, organization_id) on delete cascade,
  check (broker_share + manager_share + director_share + partner_share <= 100)
);

create table public.proposal_payment_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null,
  kind text not null check (
    kind in ('signal', 'down_payment', 'monthly', 'intermediate', 'keys', 'fgts', 'financing')
  ),
  installment_count smallint not null check (installment_count between 1 and 480),
  installment_amount numeric(14, 2) not null check (installment_amount > 0),
  total_amount numeric(16, 2) generated always as (installment_count * installment_amount) stored,
  first_due_date date not null,
  interval_months smallint not null default 1 check (interval_months between 1 and 12),
  position smallint not null default 0 check (position between 0 and 50),
  created_at timestamptz not null default now(),
  foreign key (proposal_id, organization_id)
    references public.property_proposals(id, organization_id) on delete cascade,
  unique (proposal_id, position)
);

create index proposal_payment_items_proposal_idx
  on public.proposal_payment_items (organization_id, proposal_id, position);

alter table public.property_proposals
  add column if not exists commercial_rules_snapshot jsonb,
  add column if not exists analysis_reference_date date;

create trigger development_commercial_rules_touch_updated_at before update on public.development_commercial_rules
for each row execute function private.touch_updated_at();
create trigger development_commercial_rules_audit after insert or update or delete on public.development_commercial_rules
for each row execute function private.audit_domain_change();
create trigger proposal_payment_items_audit after insert or update or delete on public.proposal_payment_items
for each row execute function private.audit_domain_change();

-- Grava as regras vigentes quando a proposta entra em análise ou na fila
-- (inclusive no reenvio após contraproposta), para a análise ser rastreável.
create or replace function private.snapshot_commercial_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('in_review', 'queued') and old.status in ('draft', 'countered') then
    select to_jsonb(r) - 'id' - 'organization_id' - 'updated_by' - 'created_at'
      into new.commercial_rules_snapshot
    from public.development_commercial_rules r
    join public.development_units u on u.development_id = r.development_id
    where u.id = new.unit_id;
    new.analysis_reference_date := current_date;
  end if;
  return new;
end;
$$;

create trigger property_proposals_snapshot_rules before update of status on public.property_proposals
for each row execute function private.snapshot_commercial_rules();

revoke all on function private.snapshot_commercial_rules() from public, anon, authenticated;

-- Fluxo de pagamento: substitui todas as parcelas de uma vez e atualiza a projeção
-- (entrada, FGTS e financiamento) na proposta, na mesma transação.
create or replace function public.replace_proposal_payment_plan(
  p_organization_id uuid,
  p_proposal_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offered numeric;
  v_total numeric;
begin
  if not private.can_edit_proposal(p_proposal_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid_plan' using errcode = '22023';
  end if;

  select offered_price into v_offered from public.property_proposals
  where id = p_proposal_id and organization_id = p_organization_id
  for update;
  if not found then
    raise exception 'proposal_not_found' using errcode = 'P0002';
  end if;

  delete from public.proposal_payment_items where proposal_id = p_proposal_id;

  insert into public.proposal_payment_items (
    organization_id, proposal_id, kind, installment_count, installment_amount,
    first_due_date, interval_months, position
  )
  select
    p_organization_id, p_proposal_id, item ->> 'kind',
    (item ->> 'installment_count')::smallint,
    round((item ->> 'installment_amount')::numeric, 2),
    (item ->> 'first_due_date')::date,
    coalesce((item ->> 'interval_months')::smallint, 1),
    (ordinality - 1)::smallint
  from jsonb_array_elements(p_items) with ordinality as t(item, ordinality);

  select coalesce(sum(total_amount), 0) into v_total
  from public.proposal_payment_items where proposal_id = p_proposal_id;
  if v_total > v_offered + 0.01 then
    raise exception 'plan_exceeds_price' using errcode = '22023';
  end if;

  update public.property_proposals p
  set down_payment = coalesce((select sum(total_amount) from public.proposal_payment_items
                               where proposal_id = p.id and kind in ('signal', 'down_payment')), 0),
      fgts_amount = coalesce((select sum(total_amount) from public.proposal_payment_items
                              where proposal_id = p.id and kind = 'fgts'), 0),
      financing_amount = coalesce((select sum(total_amount) from public.proposal_payment_items
                                   where proposal_id = p.id and kind = 'financing'), 0)
  where p.id = p_proposal_id;
end;
$$;

-- Com fluxo cadastrado, entrada/FGTS/financiamento passam a ser projeção do fluxo.
create or replace function public.update_property_proposal_terms(
  p_organization_id uuid,
  p_proposal_id uuid,
  p_offered_price numeric,
  p_down_payment numeric,
  p_fgts_amount numeric,
  p_financing_amount numeric,
  p_payment_notes text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_has_plan boolean;
begin
  if not private.can_edit_proposal(p_proposal_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_has_plan := exists (select 1 from public.proposal_payment_items where proposal_id = p_proposal_id);
  update public.property_proposals
  set offered_price = p_offered_price,
      down_payment = case when v_has_plan then down_payment else coalesce(p_down_payment, 0) end,
      fgts_amount = case when v_has_plan then fgts_amount else coalesce(p_fgts_amount, 0) end,
      financing_amount = case when v_has_plan then financing_amount else coalesce(p_financing_amount, 0) end,
      payment_notes = nullif(btrim(p_payment_notes), ''),
      notes = nullif(btrim(p_notes), '')
  where id = p_proposal_id and organization_id = p_organization_id;
  if not found then
    raise exception 'proposal_not_found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.get_proposal_missing_requirements(p_proposal_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_missing text[] := '{}';
  v_buyer public.proposal_parties%rowtype;
  v_party public.proposal_parties%rowtype;
  v_plan_items integer;
  v_plan_total numeric;
  v_offered numeric;
begin
  if not private.can_view_proposal(p_proposal_id) then
    raise exception 'proposal_not_found' using errcode = 'P0002';
  end if;

  select * into v_buyer from public.proposal_parties
  where proposal_id = p_proposal_id and role = 'buyer';
  if not found then
    return array['buyer_missing']::text[];
  end if;

  if v_buyer.marital_status in ('married', 'stable_union') and not exists (
    select 1 from public.proposal_parties where proposal_id = p_proposal_id and role = 'spouse'
  ) then
    v_missing := v_missing || 'spouse_missing'::text;
  end if;

  for v_party in
    select * from public.proposal_parties where proposal_id = p_proposal_id
    order by case role when 'buyer' then 0 when 'spouse' then 1 else 2 end, created_at
  loop
    if v_party.cpf is null then v_missing := v_missing || (v_party.id::text || ':cpf'); end if;
    if v_party.marital_status is null then v_missing := v_missing || (v_party.id::text || ':marital_status'); end if;
    if v_party.income_type is null then v_missing := v_missing || (v_party.id::text || ':income_type'); end if;
    if v_party.role = 'buyer' and v_party.phone is null then
      v_missing := v_missing || (v_party.id::text || ':phone');
    end if;

    if not exists (select 1 from public.proposal_documents d
                   where d.proposal_id = p_proposal_id and d.party_id = v_party.id and d.document_type = 'identity') then
      v_missing := v_missing || (v_party.id::text || ':doc:identity');
    end if;
    if not exists (select 1 from public.proposal_documents d
                   where d.proposal_id = p_proposal_id and d.party_id = v_party.id and d.document_type = 'civil_status_certificate') then
      v_missing := v_missing || (v_party.id::text || ':doc:civil_status_certificate');
    end if;
    if coalesce(v_party.income_type, 'none') <> 'none' and not exists (
      select 1 from public.proposal_documents d
      where d.proposal_id = p_proposal_id and d.party_id = v_party.id and d.document_type = 'income_proof'
    ) then
      v_missing := v_missing || (v_party.id::text || ':doc:income_proof');
    end if;
    if v_party.role = 'buyer' and not exists (
      select 1 from public.proposal_documents d
      where d.proposal_id = p_proposal_id and d.party_id = v_party.id and d.document_type = 'proof_of_residence'
    ) then
      v_missing := v_missing || (v_party.id::text || ':doc:proof_of_residence');
    end if;
  end loop;

  -- Fluxo de pagamento: obrigatório e somando exatamente o valor ofertado.
  select count(*), coalesce(sum(total_amount), 0) into v_plan_items, v_plan_total
  from public.proposal_payment_items where proposal_id = p_proposal_id;
  if v_plan_items = 0 then
    v_missing := v_missing || 'payment_plan_missing'::text;
  else
    select offered_price into v_offered from public.property_proposals where id = p_proposal_id;
    if abs(v_plan_total - v_offered) > 0.01 then
      v_missing := v_missing || 'payment_plan_total_mismatch'::text;
    end if;
  end if;

  return v_missing;
end;
$$;

revoke all on function public.replace_proposal_payment_plan(uuid, uuid, jsonb) from public, anon;
grant execute on function public.replace_proposal_payment_plan(uuid, uuid, jsonb) to authenticated;

alter table public.development_commercial_rules enable row level security;
alter table public.proposal_payment_items enable row level security;

create policy development_commercial_rules_select_member on public.development_commercial_rules for select
to authenticated using (private.is_org_member(organization_id));
create policy development_commercial_rules_write_admin on public.development_commercial_rules for all
to authenticated using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));

create policy proposal_payment_items_select_visible on public.proposal_payment_items for select
to authenticated using (private.can_view_proposal(proposal_id));

revoke all on table public.development_commercial_rules, public.proposal_payment_items from anon;
revoke insert, update, delete, truncate on public.proposal_payment_items from authenticated;
revoke truncate on public.development_commercial_rules from authenticated;
grant select, insert, update, delete on public.development_commercial_rules to authenticated;
grant select on public.proposal_payment_items to authenticated;

comment on table public.development_commercial_rules is
  'Regras do jogo da incorporadora por empreendimento: limites da proposta e comissão.';
comment on table public.proposal_payment_items is
  'Fluxo de pagamento da proposta. Escrita somente por replace_proposal_payment_plan.';
comment on column public.property_proposals.commercial_rules_snapshot is
  'Cópia das regras comerciais no momento do envio, usada pelo analisador.';
