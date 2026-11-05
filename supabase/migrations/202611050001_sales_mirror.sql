-- Espelho de vendas: empreendimentos, blocos/torres e unidades.
-- Base para propostas por unidade (fase seguinte). Escrita restrita a owner/admin;
-- leitura para todos os membros da organização.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'development_unit_status') then
    create type public.development_unit_status as enum (
      'available', 'in_proposal', 'reserved', 'sold', 'rented', 'blocked'
    );
  end if;
end;
$$;

create table public.developments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 180),
  developer_name text check (developer_name is null or char_length(developer_name) between 2 and 180),
  stage text not null default 'launch'
    check (stage in ('pre_launch', 'launch', 'under_construction', 'ready')),
  city text not null check (char_length(city) between 2 and 120),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 120),
  address text check (address is null or char_length(address) <= 300),
  delivery_date date,
  description text check (description is null or char_length(description) <= 5000),
  -- Parâmetros do simulador. Nulos significam "não configurado": a interface pede
  -- o valor ao usuário em vez de usar uma taxa inventada.
  financing_annual_rate numeric(6, 3)
    check (financing_annual_rate is null or financing_annual_rate between 0 and 60),
  financing_max_term_months smallint
    check (financing_max_term_months is null or financing_max_term_months between 1 and 480),
  financing_max_ltv numeric(5, 2)
    check (financing_max_ltv is null or financing_max_ltv between 1 and 100),
  income_commitment_limit numeric(5, 2) not null default 30
    check (income_commitment_limit between 1 and 100),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, organization_id)
);

create table public.development_towers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  development_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  position smallint not null default 0 check (position >= 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (development_id, organization_id)
    references public.developments(id, organization_id) on delete cascade,
  unique (id, organization_id),
  unique (id, development_id),
  unique (development_id, name)
);

create table public.development_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  development_id uuid not null,
  tower_id uuid,
  code text not null check (char_length(code) between 1 and 30),
  floor smallint check (floor is null or floor between -10 and 300),
  position smallint not null default 0 check (position between 0 and 999),
  typology text check (typology is null or char_length(typology) <= 80),
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 50),
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 > 0),
  parking_spaces smallint check (parking_spaces is null or parking_spaces between 0 and 50),
  list_price numeric(14, 2) not null check (list_price >= 0),
  status public.development_unit_status not null default 'available',
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (development_id, organization_id)
    references public.developments(id, organization_id) on delete cascade,
  foreign key (tower_id, organization_id)
    references public.development_towers(id, organization_id) on delete cascade,
  -- Garante que o bloco pertence ao mesmo empreendimento da unidade.
  foreign key (tower_id, development_id)
    references public.development_towers(id, development_id) on delete cascade,
  unique (id, organization_id),
  unique nulls not distinct (development_id, tower_id, code)
);

create index developments_list_idx
  on public.developments (organization_id, updated_at desc)
  where archived_at is null;
create index development_towers_order_idx
  on public.development_towers (organization_id, development_id, position, name);
create index development_units_mirror_idx
  on public.development_units (organization_id, development_id, tower_id, floor desc, position, code);
create index development_units_status_idx
  on public.development_units (organization_id, development_id, status);

create trigger developments_touch_updated_at before update on public.developments
for each row execute function private.touch_updated_at();
create trigger development_towers_touch_updated_at before update on public.development_towers
for each row execute function private.touch_updated_at();
create trigger development_units_touch_updated_at before update on public.development_units
for each row execute function private.touch_updated_at();

create trigger developments_audit after insert or update or delete on public.developments
for each row execute function private.audit_domain_change();
create trigger development_towers_audit after insert or update or delete on public.development_towers
for each row execute function private.audit_domain_change();
create trigger development_units_audit after insert or update or delete on public.development_units
for each row execute function private.audit_domain_change();

-- Fatos do espelho no stream imobiliário existente.
alter table public.real_estate_events
  drop constraint if exists real_estate_events_entity_type_check;
alter table public.real_estate_events
  add constraint real_estate_events_entity_type_check check (
    entity_type in (
      'property', 'property_match', 'lead_profile', 'visit',
      'development', 'development_unit'
    )
  );

create or replace function private.stamp_unit_status_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger development_units_stamp_status before update of status on public.development_units
for each row execute function private.stamp_unit_status_change();

create or replace function private.record_development_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.real_estate_events (
    organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
  ) values (
    new.organization_id,
    'development',
    new.id,
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'development_created'
      when new.archived_at is not null and old.archived_at is null then 'development_archived'
      else 'development_updated'
    end,
    jsonb_build_object('name', new.name, 'stage', new.stage)
  );
  return new;
end;
$$;

create trigger developments_record_event
after insert or update on public.developments
for each row execute function private.record_development_event();

create or replace function private.record_development_unit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.real_estate_events (
      organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
    ) values (
      new.organization_id, 'development_unit', new.id, auth.uid(), 'unit_status_changed',
      jsonb_build_object(
        'development_id', new.development_id,
        'code', new.code,
        'from', old.status,
        'to', new.status
      )
    );
  end if;
  if new.list_price is distinct from old.list_price then
    insert into public.real_estate_events (
      organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
    ) values (
      new.organization_id, 'development_unit', new.id, auth.uid(), 'unit_price_changed',
      jsonb_build_object(
        'development_id', new.development_id,
        'code', new.code,
        'from', old.list_price,
        'to', new.list_price
      )
    );
  end if;
  return new;
end;
$$;

create trigger development_units_record_event
after update of status, list_price on public.development_units
for each row execute function private.record_development_unit_event();

revoke all on function private.stamp_unit_status_change() from public, anon, authenticated;
revoke all on function private.record_development_event() from public, anon, authenticated;
revoke all on function private.record_development_unit_event() from public, anon, authenticated;

-- Agregação do espelho no banco (contagem por status e VGV), respeitando RLS.
create or replace function public.get_developments_overview(p_organization_id uuid)
returns table (
  development_id uuid,
  total_units integer,
  available_units integer,
  in_proposal_units integer,
  reserved_units integer,
  sold_units integer,
  rented_units integer,
  blocked_units integer,
  total_vgv numeric,
  sold_vgv numeric,
  available_vgv numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    u.development_id,
    count(*)::integer,
    count(*) filter (where u.status = 'available')::integer,
    count(*) filter (where u.status = 'in_proposal')::integer,
    count(*) filter (where u.status = 'reserved')::integer,
    count(*) filter (where u.status = 'sold')::integer,
    count(*) filter (where u.status = 'rented')::integer,
    count(*) filter (where u.status = 'blocked')::integer,
    coalesce(sum(u.list_price), 0),
    coalesce(sum(u.list_price) filter (where u.status = 'sold'), 0),
    coalesce(sum(u.list_price) filter (where u.status = 'available'), 0)
  from public.development_units u
  join public.developments d
    on d.id = u.development_id and d.organization_id = u.organization_id
  where u.organization_id = p_organization_id
    and d.archived_at is null
  group by u.development_id;
$$;

revoke all on function public.get_developments_overview(uuid) from public, anon;
grant execute on function public.get_developments_overview(uuid) to authenticated;

alter table public.developments enable row level security;
alter table public.development_towers enable row level security;
alter table public.development_units enable row level security;

create policy developments_select_member on public.developments for select
to authenticated using (private.is_org_member(organization_id));
create policy developments_write_admin on public.developments for all
to authenticated using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));

create policy development_towers_select_member on public.development_towers for select
to authenticated using (private.is_org_member(organization_id));
create policy development_towers_write_admin on public.development_towers for all
to authenticated using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));

create policy development_units_select_member on public.development_units for select
to authenticated using (private.is_org_member(organization_id));
create policy development_units_write_admin on public.development_units for all
to authenticated using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));

revoke all on table public.developments, public.development_towers, public.development_units from anon;
grant select, insert, update, delete on public.developments to authenticated;
grant select, insert, update, delete on public.development_towers to authenticated;
grant select, insert, update, delete on public.development_units to authenticated;

comment on table public.development_units is
  'Unidades do espelho de vendas. in_proposal é reservado ao fluxo de propostas (fase 2).';
comment on function public.get_developments_overview(uuid) is
  'Contagem por status e VGV por empreendimento ativo, sob RLS do chamador.';
