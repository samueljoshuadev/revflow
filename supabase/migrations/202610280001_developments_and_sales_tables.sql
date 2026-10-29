-- Empreendimentos (developments) e espelho de vendas por unidade.
-- Migration incremental: nenhuma migration anterior é alterada.
-- Cada empreendimento é uma conta (organization) própria da vertical real_estate;
-- esta migration adiciona o cadastro do empreendimento e as condições comerciais
-- tipadas de cada unidade, que antes não tinham onde ser armazenadas.

create table public.developments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 180),
  developer_name text check (developer_name is null or char_length(developer_name) between 2 and 180),
  property_type public.property_type not null,
  city text not null check (char_length(city) between 2 and 120),
  state char(2) check (state is null or state ~ '^[A-Z]{2}$'),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 120),
  total_units integer check (total_units is null or total_units between 0 and 100000),
  bedrooms smallint check (bedrooms is null or bedrooms >= 0),
  private_area_m2 numeric(10, 2) check (private_area_m2 is null or private_area_m2 >= 0),
  parking_spaces smallint check (parking_spaces is null or parking_spaces >= 0),
  payment_plan_label text check (payment_plan_label is null or char_length(payment_plan_label) <= 120),
  sales_table_reference text check (sales_table_reference is null or char_length(sales_table_reference) <= 180),
  sales_table_updated_at date,
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, organization_id),
  unique (organization_id, slug)
);

alter table public.properties
  add column if not exists development_id uuid,
  add column if not exists land_area_m2 numeric(10, 2),
  add column if not exists unit_floor smallint;

alter table public.properties
  add constraint properties_land_area_m2_check
    check (land_area_m2 is null or land_area_m2 >= 0),
  add constraint properties_unit_floor_check
    check (unit_floor is null or unit_floor between 0 and 300);

alter table public.properties
  add constraint properties_development_tenant_fk
  foreign key (development_id, organization_id)
  references public.developments(id, organization_id)
  on delete set null (development_id);

-- Condições comerciais do espelho de vendas. Colunas tipadas porque estes valores
-- são filtrados, somados e exibidos em tabela; JSONB não serviria.
create table public.property_sale_terms (
  property_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  list_price numeric(14, 2) not null check (list_price >= 0),
  price_per_m2 numeric(14, 2) check (price_per_m2 is null or price_per_m2 >= 0),
  down_payment numeric(14, 2) check (down_payment is null or down_payment >= 0),
  down_payment_percent numeric(5, 2) check (
    down_payment_percent is null or down_payment_percent between 0 and 100
  ),
  monthly_installment numeric(14, 2) check (
    monthly_installment is null or monthly_installment >= 0
  ),
  monthly_installment_count smallint check (
    monthly_installment_count is null or monthly_installment_count between 0 and 600
  ),
  annual_installment numeric(14, 2) check (
    annual_installment is null or annual_installment >= 0
  ),
  annual_installment_count smallint check (
    annual_installment_count is null or annual_installment_count between 0 and 100
  ),
  keys_payment numeric(14, 2) check (keys_payment is null or keys_payment >= 0),
  financing_amount numeric(14, 2) check (financing_amount is null or financing_amount >= 0),
  financing_percent numeric(5, 2) check (
    financing_percent is null or financing_percent between 0 and 100
  ),
  source_reference text check (source_reference is null or char_length(source_reference) <= 180),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (property_id, organization_id)
    references public.properties(id, organization_id) on delete cascade,
  unique (property_id, organization_id)
);

create index developments_list_idx
  on public.developments (organization_id, updated_at desc)
  where archived_at is null;
create index properties_development_idx
  on public.properties (organization_id, development_id, status, code)
  where archived_at is null and development_id is not null;
create index property_sale_terms_price_idx
  on public.property_sale_terms (organization_id, list_price);

create trigger developments_touch_updated_at before update on public.developments
for each row execute function private.touch_updated_at();
create trigger property_sale_terms_touch_updated_at before update on public.property_sale_terms
for each row execute function private.touch_updated_at();

-- real_estate_events passa a aceitar o empreendimento como entidade.
alter table public.real_estate_events
  drop constraint if exists real_estate_events_entity_type_check;
alter table public.real_estate_events
  add constraint real_estate_events_entity_type_check
  check (
    entity_type in ('property', 'property_match', 'lead_profile', 'visit', 'development')
  );

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
    coalesce(new.organization_id, old.organization_id),
    'development',
    coalesce(new.id, old.id),
    auth.uid(),
    case tg_op when 'INSERT' then 'development_created'
               when 'UPDATE' then 'development_updated'
               else 'development_deleted' end,
    case tg_op
      when 'DELETE' then jsonb_build_object('slug', old.slug, 'name', old.name)
      else jsonb_build_object('slug', new.slug, 'name', new.name)
    end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger developments_record_event
after insert or update or delete on public.developments
for each row execute function private.record_development_event();

revoke all on function private.record_development_event() from public;

alter table public.developments enable row level security;
alter table public.property_sale_terms enable row level security;

create policy developments_select_member on public.developments for select
to authenticated using (private.is_org_member(organization_id));
create policy developments_write_member on public.developments for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy property_sale_terms_select_member on public.property_sale_terms for select
to authenticated using (private.is_org_member(organization_id));
create policy property_sale_terms_write_member on public.property_sale_terms for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

-- Importação transacional do espelho de vendas.
-- Idempotente por (organization_id, code): reimportar a mesma tabela atualiza
-- preço, status e condições sem duplicar unidade nem perder histórico de eventos.
create or replace function public.import_sales_table(
  p_organization_id uuid,
  p_development_id uuid,
  p_units jsonb,
  p_source_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_development public.developments%rowtype;
  v_unit jsonb;
  v_property_id uuid;
  v_code text;
  v_status public.property_status;
  v_list_price numeric;
  v_created integer := 0;
  v_updated integer := 0;
  v_without_price integer := 0;
begin
  -- Usuário autenticado precisa de permissão de escrita na organização.
  -- O job de provisionamento (service_role) importa a tabela oficial sem sessão.
  if not (
    private.can_write_org(p_organization_id)
    or coalesce(auth.role(), '') = 'service_role'
  ) then
    raise exception 'Access denied';
  end if;
  if jsonb_typeof(p_units) <> 'array' then
    raise exception 'Units payload must be an array';
  end if;
  if jsonb_array_length(p_units) > 5000 then
    raise exception 'Units payload is too large';
  end if;

  select * into v_development
  from public.developments
  where id = p_development_id
    and organization_id = p_organization_id
    and archived_at is null
  for update;
  if not found then
    raise exception 'Development not found';
  end if;

  for v_unit in select * from jsonb_array_elements(p_units)
  loop
    v_code := trim(v_unit ->> 'code');
    if v_code is null or char_length(v_code) = 0 then
      raise exception 'Unit code is required';
    end if;
    v_status := coalesce((v_unit ->> 'status')::public.property_status, 'available');
    v_list_price := (v_unit ->> 'list_price')::numeric;
    -- Unidade sem valor na tabela recebida não tem condição comercial publicada.
    -- Ela é registrada para o espelho ficar completo, sem preço inventado.
    if v_list_price is null then
      v_without_price := v_without_price + 1;
    end if;

    select id into v_property_id
    from public.properties
    where organization_id = p_organization_id
      and code = v_code;

    if v_property_id is null then
      insert into public.properties (
        organization_id, development_id, code, title, status, property_type, purpose,
        price, city, neighborhood, area_m2, land_area_m2, unit_floor,
        bedrooms, bathrooms, parking_spaces, description, created_by
      ) values (
        p_organization_id,
        v_development.id,
        v_code,
        v_unit ->> 'title',
        v_status,
        coalesce((v_unit ->> 'property_type')::public.property_type, v_development.property_type),
        'sale',
        coalesce(v_list_price, 0),
        coalesce(v_unit ->> 'city', v_development.city),
        coalesce(v_unit ->> 'neighborhood', v_development.neighborhood),
        coalesce((v_unit ->> 'area_m2')::numeric, v_development.private_area_m2),
        (v_unit ->> 'land_area_m2')::numeric,
        (v_unit ->> 'unit_floor')::smallint,
        coalesce((v_unit ->> 'bedrooms')::smallint, v_development.bedrooms),
        (v_unit ->> 'bathrooms')::smallint,
        coalesce((v_unit ->> 'parking_spaces')::smallint, v_development.parking_spaces),
        v_unit ->> 'description',
        auth.uid()
      )
      returning id into v_property_id;
      v_created := v_created + 1;
    else
      update public.properties
      set development_id = v_development.id,
          title = coalesce(v_unit ->> 'title', title),
          status = v_status,
          price = coalesce(v_list_price, price),
          area_m2 = coalesce((v_unit ->> 'area_m2')::numeric, area_m2),
          land_area_m2 = coalesce((v_unit ->> 'land_area_m2')::numeric, land_area_m2),
          unit_floor = coalesce((v_unit ->> 'unit_floor')::smallint, unit_floor),
          bedrooms = coalesce((v_unit ->> 'bedrooms')::smallint, bedrooms),
          parking_spaces = coalesce((v_unit ->> 'parking_spaces')::smallint, parking_spaces),
          archived_at = null
      where id = v_property_id
        and organization_id = p_organization_id;
      v_updated := v_updated + 1;
    end if;

    if v_list_price is null then
      delete from public.property_sale_terms
      where property_id = v_property_id
        and organization_id = p_organization_id;
      continue;
    end if;

    insert into public.property_sale_terms (
      property_id, organization_id, list_price, price_per_m2,
      down_payment, down_payment_percent,
      monthly_installment, monthly_installment_count,
      annual_installment, annual_installment_count,
      keys_payment, financing_amount, financing_percent, source_reference, created_by
    ) values (
      v_property_id,
      p_organization_id,
      v_list_price,
      (v_unit ->> 'price_per_m2')::numeric,
      (v_unit ->> 'down_payment')::numeric,
      (v_unit ->> 'down_payment_percent')::numeric,
      (v_unit ->> 'monthly_installment')::numeric,
      (v_unit ->> 'monthly_installment_count')::smallint,
      (v_unit ->> 'annual_installment')::numeric,
      (v_unit ->> 'annual_installment_count')::smallint,
      (v_unit ->> 'keys_payment')::numeric,
      (v_unit ->> 'financing_amount')::numeric,
      (v_unit ->> 'financing_percent')::numeric,
      coalesce(p_source_reference, v_development.sales_table_reference),
      auth.uid()
    )
    on conflict (property_id) do update
    set list_price = excluded.list_price,
        price_per_m2 = excluded.price_per_m2,
        down_payment = excluded.down_payment,
        down_payment_percent = excluded.down_payment_percent,
        monthly_installment = excluded.monthly_installment,
        monthly_installment_count = excluded.monthly_installment_count,
        annual_installment = excluded.annual_installment,
        annual_installment_count = excluded.annual_installment_count,
        keys_payment = excluded.keys_payment,
        financing_amount = excluded.financing_amount,
        financing_percent = excluded.financing_percent,
        source_reference = excluded.source_reference;
  end loop;

  update public.developments
  set sales_table_reference = coalesce(p_source_reference, sales_table_reference),
      sales_table_updated_at = current_date
  where id = v_development.id
    and organization_id = p_organization_id;

  insert into public.real_estate_events (
    organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
  ) values (
    p_organization_id,
    'development',
    v_development.id,
    auth.uid(),
    'sales_table_imported',
    jsonb_build_object(
      'created', v_created,
      'updated', v_updated,
      'without_price', v_without_price,
      'source_reference', coalesce(p_source_reference, v_development.sales_table_reference)
    )
  );

  return jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'without_price', v_without_price
  );
end;
$$;

revoke all on function public.import_sales_table(uuid, uuid, jsonb, text) from public;
grant execute on function public.import_sales_table(uuid, uuid, jsonb, text) to authenticated;

-- Provisionamento de uma conta por empreendimento.
-- Executada apenas por um job confiável (service_role), nunca pelo usuário final:
-- cria a organização da vertical imobiliária, o owner, o pipeline padrão e o
-- cadastro do empreendimento em uma única transação.
create or replace function public.provision_development_account(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_development jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
  v_development_id uuid;
  v_pipeline_id uuid;
begin
  if char_length(trim(p_name)) < 2 then
    raise exception 'Organization name is too short';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid organization slug';
  end if;
  if not exists (select 1 from auth.users where id = p_owner_user_id) then
    raise exception 'Owner user not found';
  end if;

  select id into v_organization_id from public.organizations where slug = p_slug;

  if v_organization_id is null then
    insert into public.organizations (name, slug, created_by, vertical)
    values (trim(p_name), p_slug, p_owner_user_id, 'real_estate')
    returning id into v_organization_id;

    insert into public.pipelines (organization_id, name, is_default)
    values (v_organization_id, 'Pipeline imobiliário', true)
    returning id into v_pipeline_id;

    insert into public.pipeline_stages (
      organization_id, pipeline_id, name, slug, color, position, probability, is_closed, is_won
    ) values
      (v_organization_id, v_pipeline_id, 'Novo lead', 'novo-lead', '#E8A51B', 0, 5, false, false),
      (v_organization_id, v_pipeline_id, 'Perfil identificado', 'perfil-identificado', '#DDA020', 1, 15, false, false),
      (v_organization_id, v_pipeline_id, 'Imóveis recomendados', 'imoveis-recomendados', '#CA8D18', 2, 30, false, false),
      (v_organization_id, v_pipeline_id, 'Visita agendada', 'visita-agendada', '#B8790F', 3, 45, false, false),
      (v_organization_id, v_pipeline_id, 'Visita realizada', 'visita-realizada', '#9D660B', 4, 55, false, false),
      (v_organization_id, v_pipeline_id, 'Documentação / crédito', 'documentacao-credito', '#7E5A16', 5, 65, false, false),
      (v_organization_id, v_pipeline_id, 'Proposta', 'proposta', '#5F4D20', 6, 78, false, false),
      (v_organization_id, v_pipeline_id, 'Contrato', 'contrato', '#3F4430', 7, 90, false, false),
      (v_organization_id, v_pipeline_id, 'Fechado ganho', 'fechado-ganho', '#15803D', 8, 100, true, true),
      (v_organization_id, v_pipeline_id, 'Fechado perdido', 'fechado-perdido', '#B42318', 9, 0, true, false);
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, p_owner_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  insert into public.developments (
    organization_id, slug, name, developer_name, property_type, city, state,
    neighborhood, total_units, bedrooms, private_area_m2, parking_spaces,
    payment_plan_label, sales_table_reference, notes, created_by
  ) values (
    v_organization_id,
    p_development ->> 'slug',
    p_development ->> 'name',
    p_development ->> 'developer_name',
    (p_development ->> 'property_type')::public.property_type,
    p_development ->> 'city',
    p_development ->> 'state',
    p_development ->> 'neighborhood',
    (p_development ->> 'total_units')::integer,
    (p_development ->> 'bedrooms')::smallint,
    (p_development ->> 'private_area_m2')::numeric,
    (p_development ->> 'parking_spaces')::smallint,
    p_development ->> 'payment_plan_label',
    p_development ->> 'sales_table_reference',
    p_development ->> 'notes',
    p_owner_user_id
  )
  on conflict (organization_id, slug) do update
  set name = excluded.name,
      developer_name = excluded.developer_name,
      city = excluded.city,
      state = excluded.state,
      neighborhood = excluded.neighborhood,
      total_units = excluded.total_units,
      bedrooms = excluded.bedrooms,
      private_area_m2 = excluded.private_area_m2,
      parking_spaces = excluded.parking_spaces,
      payment_plan_label = excluded.payment_plan_label,
      sales_table_reference = excluded.sales_table_reference,
      notes = excluded.notes,
      archived_at = null
  returning id into v_development_id;

  return jsonb_build_object(
    'organization_id', v_organization_id,
    'development_id', v_development_id
  );
end;
$$;

revoke all on function public.provision_development_account(text, text, uuid, jsonb) from public;
revoke all on function public.provision_development_account(text, text, uuid, jsonb) from authenticated;
grant execute on function public.provision_development_account(text, text, uuid, jsonb) to service_role;

-- Concede acesso de um usuário existente a uma conta de empreendimento.
-- Também restrita ao service_role: o fluxo de usuário continua usando convites.
create or replace function public.grant_development_account_access(
  p_organization_slug text,
  p_user_id uuid,
  p_role public.organization_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid;
begin
  select id into v_organization_id
  from public.organizations
  where slug = p_organization_slug;
  if v_organization_id is null then
    raise exception 'Organization not found';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'User not found';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, p_user_id, p_role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  return v_organization_id;
end;
$$;

revoke all on function public.grant_development_account_access(text, uuid, public.organization_role) from public;
revoke all on function public.grant_development_account_access(text, uuid, public.organization_role) from authenticated;
grant execute on function public.grant_development_account_access(text, uuid, public.organization_role) to service_role;

-- Resumo do espelho por empreendimento, agregado no banco.
create or replace function public.get_development_summary(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'Access denied';
  end if;

  select coalesce(jsonb_agg(row_to_json(summary) order by summary.name), '[]'::jsonb)
  into v_result
  from (
    select d.id,
      d.slug,
      d.name,
      d.city,
      d.neighborhood,
      d.total_units,
      d.payment_plan_label,
      d.sales_table_reference,
      d.sales_table_updated_at,
      count(p.id)::integer as units_imported,
      count(p.id) filter (where p.status = 'available')::integer as units_available,
      count(p.id) filter (where p.status = 'reserved')::integer as units_reserved,
      count(p.id) filter (where p.status = 'sold')::integer as units_sold,
      min(p.price) filter (where p.status = 'available') as min_available_price,
      max(p.price) filter (where p.status = 'available') as max_available_price,
      coalesce(sum(p.price) filter (where p.status = 'available'), 0) as available_inventory_value
    from public.developments d
    left join public.properties p
      on p.development_id = d.id
      and p.organization_id = d.organization_id
      and p.archived_at is null
    where d.organization_id = p_organization_id
      and d.archived_at is null
    group by d.id, d.slug, d.name, d.city, d.neighborhood, d.total_units,
      d.payment_plan_label, d.sales_table_reference, d.sales_table_updated_at
  ) summary;

  return v_result;
end;
$$;

revoke all on function public.get_development_summary(uuid) from public;
grant execute on function public.get_development_summary(uuid) to authenticated;
