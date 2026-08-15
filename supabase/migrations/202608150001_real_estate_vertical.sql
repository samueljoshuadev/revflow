-- RevFlow Real Estate: one multi-tenant application, two organization verticals.
-- This migration is incremental and does not modify previously applied files.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'organization_vertical'
  ) then
    create type public.organization_vertical as enum ('agency', 'real_estate');
  end if;
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'property_status'
  ) then
    create type public.property_status as enum ('available', 'reserved', 'sold', 'inactive');
  end if;
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'property_type'
  ) then
    create type public.property_type as enum ('apartment', 'house', 'commercial', 'land', 'rural', 'other');
  end if;
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'property_purpose'
  ) then
    create type public.property_purpose as enum ('sale', 'rent');
  end if;
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'property_match_status'
  ) then
    create type public.property_match_status as enum (
      'recommended', 'sent', 'favorite', 'rejected', 'visit_scheduled'
    );
  end if;
end
$$;

alter table public.organizations
  add column if not exists vertical public.organization_vertical not null default 'agency';

create index if not exists organizations_vertical_idx
  on public.organizations (vertical, created_at desc);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 60),
  title text not null check (char_length(title) between 2 and 180),
  status public.property_status not null default 'available',
  property_type public.property_type not null,
  purpose public.property_purpose not null,
  price numeric(14, 2) not null check (price >= 0),
  city text not null check (char_length(city) between 2 and 120),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 120),
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 >= 0),
  bedrooms smallint check (bedrooms is null or bedrooms >= 0),
  bathrooms smallint check (bathrooms is null or bathrooms >= 0),
  parking_spaces smallint check (parking_spaces is null or parking_spaces >= 0),
  description text,
  features text[] not null default '{}',
  responsible_user_id uuid,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (organization_id, responsible_user_id)
    references public.organization_members(organization_id, user_id)
    on delete set null (responsible_user_id),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null,
  storage_path text not null check (
    storage_path ~ '^organizations/[0-9a-f-]+/properties/[0-9a-f-]+/'
  ),
  alt_text text check (alt_text is null or char_length(alt_text) <= 180),
  position smallint not null default 0 check (position >= 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (property_id, organization_id)
    references public.properties(id, organization_id) on delete cascade,
  unique (id, organization_id),
  unique (organization_id, storage_path)
);

create table public.real_estate_lead_profiles (
  lead_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  budget_min numeric(14, 2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(14, 2) check (budget_max is null or budget_max >= 0),
  preferred_city text check (preferred_city is null or char_length(preferred_city) <= 120),
  preferred_neighborhood text check (preferred_neighborhood is null or char_length(preferred_neighborhood) <= 120),
  property_type public.property_type,
  purpose public.property_purpose,
  minimum_bedrooms smallint check (minimum_bedrooms is null or minimum_bedrooms >= 0),
  payment_method text check (
    payment_method is null or payment_method in ('cash', 'financing', 'consortium', 'exchange', 'other')
  ),
  available_down_payment numeric(14, 2) check (
    available_down_payment is null or available_down_payment >= 0
  ),
  urgency text check (urgency is null or urgency in ('low', 'medium', 'high', 'immediate')),
  purchase_deadline date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade,
  unique (lead_id, organization_id),
  check (budget_max is null or budget_min is null or budget_max >= budget_min)
);

create table public.property_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  property_id uuid not null,
  score smallint not null check (score between 0 and 100),
  match_reason text not null check (char_length(match_reason) between 2 and 1000),
  status public.property_match_status not null default 'recommended',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade,
  foreign key (property_id, organization_id)
    references public.properties(id, organization_id) on delete cascade,
  unique (id, organization_id),
  unique (organization_id, lead_id, property_id)
);

alter table public.meetings add column if not exists property_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'meetings_property_tenant_fk'
      and conrelid = 'public.meetings'::regclass
  ) then
    alter table public.meetings
      add constraint meetings_property_tenant_fk
      foreign key (property_id, organization_id)
      references public.properties(id, organization_id)
      on delete set null (property_id);
  end if;
end
$$;

create table public.real_estate_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (
    entity_type in ('property', 'property_match', 'lead_profile', 'visit')
  ),
  entity_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index properties_list_idx
  on public.properties (organization_id, status, updated_at desc)
  where archived_at is null;
create index properties_location_idx
  on public.properties (organization_id, city, neighborhood, purpose, property_type, price)
  where archived_at is null and status = 'available';
create index property_photos_order_idx
  on public.property_photos (organization_id, property_id, position, created_at);
create index real_estate_lead_profiles_search_idx
  on public.real_estate_lead_profiles (
    organization_id, purpose, property_type, preferred_city, preferred_neighborhood
  );
create index property_matches_lead_idx
  on public.property_matches (organization_id, lead_id, status, score desc, updated_at desc);
create index property_matches_property_idx
  on public.property_matches (organization_id, property_id, status, updated_at desc);
create index meetings_property_schedule_idx
  on public.meetings (organization_id, property_id, status, starts_at)
  where property_id is not null;
create index real_estate_events_entity_idx
  on public.real_estate_events (organization_id, entity_type, entity_id, created_at desc);

create trigger properties_touch_updated_at before update on public.properties
for each row execute function private.touch_updated_at();
create trigger real_estate_lead_profiles_touch_updated_at before update on public.real_estate_lead_profiles
for each row execute function private.touch_updated_at();
create trigger property_matches_touch_updated_at before update on public.property_matches
for each row execute function private.touch_updated_at();

create or replace function private.record_property_event()
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
    'property',
    coalesce(new.id, old.id),
    auth.uid(),
    case tg_op when 'INSERT' then 'property_created'
               when 'UPDATE' then 'property_updated'
               else 'property_deleted' end,
    case tg_op
      when 'DELETE' then jsonb_build_object('code', old.code, 'title', old.title)
      else jsonb_build_object('code', new.code, 'status', new.status, 'title', new.title)
    end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.record_property_match_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_organization_id uuid := coalesce(new.organization_id, old.organization_id);
  v_lead_id uuid := coalesce(new.lead_id, old.lead_id);
  v_property_id uuid := coalesce(new.property_id, old.property_id);
  v_event_type text;
begin
  v_event_type := case tg_op when 'INSERT' then 'property_recommended'
                  when 'UPDATE' then 'property_match_updated'
                  else 'property_match_removed' end;
  insert into public.real_estate_events (
    organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
  ) values (
    v_organization_id,
    'property_match',
    coalesce(new.id, old.id),
    auth.uid(),
    v_event_type,
    jsonb_build_object(
      'lead_id', v_lead_id,
      'property_id', v_property_id,
      'status', case when tg_op = 'DELETE' then old.status else new.status end,
      'score', case when tg_op = 'DELETE' then old.score else new.score end
    )
  );
  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, metadata, source
  ) values (
    v_organization_id,
    v_lead_id,
    auth.uid(),
    v_event_type,
    jsonb_build_object('property_id', v_property_id),
    'user'
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.record_real_estate_profile_event()
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
    'lead_profile',
    new.lead_id,
    auth.uid(),
    case tg_op when 'INSERT' then 'lead_profile_created' else 'lead_profile_updated' end,
    jsonb_build_object('purpose', new.purpose, 'property_type', new.property_type)
  );
  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, metadata, source
  ) values (
    new.organization_id,
    new.lead_id,
    auth.uid(),
    case tg_op when 'INSERT' then 'real_estate_profile_created' else 'real_estate_profile_updated' end,
    jsonb_build_object('purpose', new.purpose, 'property_type', new.property_type),
    'user'
  );
  return new;
end;
$$;

create trigger properties_record_event
after insert or update or delete on public.properties
for each row execute function private.record_property_event();
create trigger property_matches_record_event
after insert or update or delete on public.property_matches
for each row execute function private.record_property_match_event();
create trigger real_estate_lead_profiles_record_event
after insert or update on public.real_estate_lead_profiles
for each row execute function private.record_real_estate_profile_event();

revoke all on function private.record_property_event() from public;
revoke all on function private.record_property_match_event() from public;
revoke all on function private.record_real_estate_profile_event() from public;

alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.real_estate_lead_profiles enable row level security;
alter table public.property_matches enable row level security;
alter table public.real_estate_events enable row level security;

create policy properties_select_member on public.properties for select
to authenticated using (private.is_org_member(organization_id));
create policy properties_write_member on public.properties for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy property_photos_select_member on public.property_photos for select
to authenticated using (private.is_org_member(organization_id));
create policy property_photos_write_member on public.property_photos for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy real_estate_lead_profiles_select_member on public.real_estate_lead_profiles for select
to authenticated using (private.is_org_member(organization_id));
create policy real_estate_lead_profiles_write_member on public.real_estate_lead_profiles for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy property_matches_select_member on public.property_matches for select
to authenticated using (private.is_org_member(organization_id));
create policy property_matches_write_member on public.property_matches for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy real_estate_events_select_member on public.real_estate_events for select
to authenticated using (private.is_org_member(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists property_photos_storage_select on storage.objects;
create policy property_photos_storage_select on storage.objects for select
to authenticated using (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] = 'organizations'
  and private.is_org_member(((storage.foldername(name))[2])::uuid)
);

drop policy if exists property_photos_storage_insert on storage.objects;
create policy property_photos_storage_insert on storage.objects for insert
to authenticated with check (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] = 'organizations'
  and private.can_write_org(((storage.foldername(name))[2])::uuid)
);

drop policy if exists property_photos_storage_update on storage.objects;
create policy property_photos_storage_update on storage.objects for update
to authenticated using (
  bucket_id = 'property-photos'
  and private.can_write_org(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'property-photos'
  and private.can_write_org(((storage.foldername(name))[2])::uuid)
);

drop policy if exists property_photos_storage_delete on storage.objects;
create policy property_photos_storage_delete on storage.objects for delete
to authenticated using (
  bucket_id = 'property-photos'
  and private.can_write_org(((storage.foldername(name))[2])::uuid)
);

create or replace function public.create_organization_with_vertical(
  p_name text,
  p_slug text,
  p_vertical public.organization_vertical
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_pipeline_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_vertical = 'agency' then
    return public.create_organization_with_defaults(p_name, p_slug);
  end if;
  if char_length(trim(p_name)) < 2 then raise exception 'Organization name is too short'; end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid organization slug'; end if;

  insert into public.organizations (name, slug, created_by, vertical)
  values (trim(p_name), p_slug, v_user_id, 'real_estate')
  returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');

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

  return v_organization_id;
end;
$$;

revoke all on function public.create_organization_with_vertical(text, text, public.organization_vertical) from public;
grant execute on function public.create_organization_with_vertical(text, text, public.organization_vertical) to authenticated;

create or replace function public.get_real_estate_dashboard_metrics(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not private.is_org_member(p_organization_id) then raise exception 'Access denied'; end if;
  if not exists (
    select 1 from public.organizations
    where id = p_organization_id and vertical = 'real_estate'
  ) then raise exception 'Organization is not real estate'; end if;

  select jsonb_build_object(
    'leads_received', (select count(*) from public.leads where organization_id = p_organization_id and archived_at is null),
    'new_leads_30d', (select count(*) from public.leads where organization_id = p_organization_id and created_at >= now() - interval '30 days' and archived_at is null),
    'scheduled_visits', (select count(*) from public.meetings where organization_id = p_organization_id and property_id is not null and status = 'scheduled'),
    'completed_visits', (select count(*) from public.meetings where organization_id = p_organization_id and property_id is not null and status = 'completed'),
    'proposals', (select count(*) from public.proposals where organization_id = p_organization_id),
    'available_properties', (select count(*) from public.properties where organization_id = p_organization_id and status = 'available' and archived_at is null),
    'average_first_response_minutes', (
      select round(avg(extract(epoch from (first_event_at - created_at)) / 60.0))
      from (
        select l.created_at, min(e.created_at) as first_event_at
        from public.leads l
        join public.lead_events e on e.lead_id = l.id and e.organization_id = l.organization_id
        where l.organization_id = p_organization_id
          and e.event_type in ('note_added', 'meeting_scheduled', 'stage_changed', 'lead_updated')
        group by l.id, l.created_at
      ) responses
    ),
    'broker_conversion', coalesce((
      select jsonb_agg(row_to_json(performance) order by performance.won desc, performance.leads desc)
      from (
        select om.user_id,
          coalesce(pr.full_name, 'Membro') as name,
          count(l.id)::integer as leads,
          count(l.id) filter (where ps.is_won)::integer as won,
          case when count(l.id) = 0 then 0
               else round(100.0 * count(l.id) filter (where ps.is_won) / count(l.id), 1) end as conversion_rate
        from public.organization_members om
        left join public.profiles pr on pr.id = om.user_id
        left join public.leads l on l.organization_id = om.organization_id and l.owner_id = om.user_id and l.archived_at is null
        left join public.pipeline_stages ps on ps.id = l.stage_id and ps.organization_id = l.organization_id
        where om.organization_id = p_organization_id
        group by om.user_id, pr.full_name
      ) performance
    ), '[]'::jsonb),
    'loss_reasons', coalesce((
      select jsonb_agg(row_to_json(losses) order by losses.count desc)
      from (
        select coalesce(nullif(trim(lost_reason), ''), 'Não informado') as reason, count(*)::integer as count
        from public.leads
        where organization_id = p_organization_id and lost_reason is not null
        group by 1 limit 8
      ) losses
    ), '[]'::jsonb),
    'top_properties', coalesce((
      select jsonb_agg(row_to_json(ranked) order by ranked.recommendations desc)
      from (
        select p.id, p.code, p.title, count(pm.id)::integer as recommendations
        from public.properties p
        join public.property_matches pm on pm.property_id = p.id and pm.organization_id = p.organization_id
        where p.organization_id = p_organization_id and p.archived_at is null
        group by p.id, p.code, p.title
        order by count(pm.id) desc limit 8
      ) ranked
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_real_estate_dashboard_metrics(uuid) from public;
grant execute on function public.get_real_estate_dashboard_metrics(uuid) to authenticated;

create or replace function public.schedule_property_visit(
  p_organization_id uuid,
  p_lead_id uuid,
  p_property_id uuid,
  p_owner_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_timezone text,
  p_description text default null,
  p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meeting_id uuid;
begin
  if not private.can_write_org(p_organization_id) then
    raise exception 'Access denied';
  end if;
  if not exists (
    select 1
    from public.properties
    where id = p_property_id
      and organization_id = p_organization_id
      and archived_at is null
      and status not in ('sold', 'inactive')
  ) then
    raise exception 'Property not available';
  end if;

  v_meeting_id := public.schedule_meeting(
    p_organization_id,
    p_lead_id,
    p_owner_id,
    p_title,
    p_starts_at,
    p_ends_at,
    p_timezone,
    p_description,
    p_location
  );

  update public.meetings
  set property_id = p_property_id
  where id = v_meeting_id
    and organization_id = p_organization_id;

  insert into public.real_estate_events (
    organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
  ) values (
    p_organization_id,
    'visit',
    v_meeting_id,
    auth.uid(),
    'visit_scheduled',
    jsonb_build_object(
      'lead_id', p_lead_id,
      'property_id', p_property_id,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    )
  );

  return v_meeting_id;
end;
$$;

revoke all on function public.schedule_property_visit(uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, text, text, text) from public;
grant execute on function public.schedule_property_visit(uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, text, text, text) to authenticated;

create or replace function public.reschedule_property_visit(
  p_organization_id uuid,
  p_meeting_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meeting public.meetings%rowtype;
begin
  if not private.can_write_org(p_organization_id) then raise exception 'Access denied'; end if;
  if p_ends_at <= p_starts_at then raise exception 'Invalid interval'; end if;
  select * into v_meeting from public.meetings
  where id = p_meeting_id and organization_id = p_organization_id
    and property_id is not null
  for update;
  if not found then raise exception 'Visit not found'; end if;

  if exists (
    select 1 from public.meetings
    where organization_id = p_organization_id
      and owner_id = v_meeting.owner_id
      and id <> v_meeting.id
      and status = 'scheduled'
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'Schedule conflict'; end if;

  update public.meetings
  set starts_at = p_starts_at,
      ends_at = p_ends_at,
      status = 'scheduled',
      cancelled_at = null,
      cancellation_reason = null
  where id = v_meeting.id;

  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, metadata, source
  ) values (
    p_organization_id,
    v_meeting.lead_id,
    auth.uid(),
    'visit_rescheduled',
    jsonb_build_object(
      'meeting_id', v_meeting.id,
      'property_id', v_meeting.property_id,
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    ),
    'user'
  );
  insert into public.real_estate_events (
    organization_id, entity_type, entity_id, actor_user_id, event_type, metadata
  ) values (
    p_organization_id,
    'visit',
    v_meeting.id,
    auth.uid(),
    'visit_rescheduled',
    jsonb_build_object('property_id', v_meeting.property_id, 'starts_at', p_starts_at)
  );
end;
$$;

revoke all on function public.reschedule_property_visit(uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.reschedule_property_visit(uuid, uuid, timestamptz, timestamptz) to authenticated;
