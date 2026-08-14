-- Orbit CRM: secure multi-tenant foundation for Supabase/PostgreSQL.
-- Apply with `supabase db push` after linking a Supabase project.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create type public.organization_role as enum (
  'owner', 'admin', 'manager', 'member', 'viewer'
);
create type public.lead_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.event_source as enum (
  'system', 'user', 'webhook', 'api', 'automation', 'ai'
);
create type public.webhook_status as enum (
  'pending', 'processing', 'processed', 'failed', 'ignored'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (id, full_name, avatar_url)
select
  id,
  nullif(raw_user_meta_data ->> 'full_name', ''),
  nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do nothing;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid references auth.users(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create unique index pipelines_one_default_per_organization
  on public.pipelines (organization_id)
  where is_default;

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  pipeline_id uuid not null,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position integer not null check (position >= 0),
  probability smallint not null default 0 check (probability between 0 and 100),
  is_closed boolean not null default false,
  is_won boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (pipeline_id, organization_id)
    references public.pipelines(id, organization_id) on delete cascade,
  unique (pipeline_id, position),
  unique (pipeline_id, slug),
  unique (id, pipeline_id, organization_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  pipeline_id uuid not null,
  stage_id uuid not null,
  service_id uuid,
  owner_id uuid,
  name text not null check (char_length(name) between 2 and 160),
  email text,
  phone text,
  company text,
  source text,
  campaign text,
  estimated_budget numeric(14, 2) check (estimated_budget is null or estimated_budget >= 0),
  priority public.lead_priority not null default 'medium',
  score smallint not null default 0 check (score between 0 and 100),
  summary text,
  next_action text,
  custom_fields jsonb not null default '{}'::jsonb,
  last_interaction_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (pipeline_id, organization_id)
    references public.pipelines(id, organization_id) on delete restrict,
  foreign key (stage_id, pipeline_id, organization_id)
    references public.pipeline_stages(id, pipeline_id, organization_id) on delete restrict,
  foreign key (service_id, organization_id)
    references public.services(id, organization_id) on delete set null (service_id),
  foreign key (organization_id, owner_id)
    references public.organization_members(organization_id, user_id) on delete set null (owner_id),
  unique (id, organization_id)
);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]{1,79}$'),
  metadata jsonb not null default '{}'::jsonb,
  source public.event_source not null default 'system',
  idempotency_key text,
  created_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade
);

create unique index lead_events_idempotency
  on public.lead_events (organization_id, source, idempotency_key)
  where idempotency_key is not null;

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  author_id uuid not null references auth.users(id) on delete restrict default auth.uid(),
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table public.lead_tags (
  organization_id uuid not null,
  lead_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade,
  foreign key (tag_id, organization_id)
    references public.tags(id, organization_id) on delete cascade
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  owner_id uuid,
  title text not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'completed', 'no_show')),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  external_provider text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade,
  foreign key (organization_id, owner_id)
    references public.organization_members(organization_id, user_id) on delete set null (owner_id),
  unique nulls not distinct (organization_id, external_provider, external_id)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  status public.webhook_status not null default 'pending',
  payload jsonb not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  processed_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Query indexes for the Kanban, lead search, timelines and operational jobs.
create index organization_members_user_idx
  on public.organization_members (user_id, organization_id);
create index pipeline_stages_board_idx
  on public.pipeline_stages (organization_id, pipeline_id, position);
create index leads_board_idx
  on public.leads (organization_id, pipeline_id, stage_id, updated_at desc);
create index leads_owner_idx
  on public.leads (organization_id, owner_id, updated_at desc);
create index leads_created_idx
  on public.leads (organization_id, created_at desc);
create index lead_events_timeline_idx
  on public.lead_events (organization_id, lead_id, created_at desc);
create index lead_notes_timeline_idx
  on public.lead_notes (organization_id, lead_id, created_at desc);
create index meetings_schedule_idx
  on public.meetings (organization_id, status, starts_at);
create index webhook_events_queue_idx
  on public.webhook_events (status, next_retry_at, created_at)
  where status in ('pending', 'failed');
create index audit_logs_entity_idx
  on public.audit_logs (organization_id, entity_type, entity_id, created_at desc);

-- Avoid recursive RLS checks by centralizing membership checks in private functions.
create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.can_write_org(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'manager', 'member')
  );
$$;

create or replace function private.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.can_write_org(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger organizations_touch_updated_at before update on public.organizations
for each row execute function private.touch_updated_at();
create trigger organization_members_touch_updated_at before update on public.organization_members
for each row execute function private.touch_updated_at();
create trigger pipelines_touch_updated_at before update on public.pipelines
for each row execute function private.touch_updated_at();
create trigger pipeline_stages_touch_updated_at before update on public.pipeline_stages
for each row execute function private.touch_updated_at();
create trigger services_touch_updated_at before update on public.services
for each row execute function private.touch_updated_at();
create trigger leads_touch_updated_at before update on public.leads
for each row execute function private.touch_updated_at();
create trigger lead_notes_touch_updated_at before update on public.lead_notes
for each row execute function private.touch_updated_at();
create trigger meetings_touch_updated_at before update on public.meetings
for each row execute function private.touch_updated_at();
create trigger webhook_events_touch_updated_at before update on public.webhook_events
for each row execute function private.touch_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.record_lead_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, metadata, source
  ) values (
    new.organization_id,
    new.id,
    coalesce(new.created_by, auth.uid()),
    'lead_created',
    jsonb_build_object('stage_id', new.stage_id, 'pipeline_id', new.pipeline_id),
    case when auth.uid() is null then 'system'::public.event_source
         else 'user'::public.event_source end
  );
  return new;
end;
$$;

create trigger leads_record_created
after insert on public.leads
for each row execute function private.record_lead_created();

create or replace function private.audit_lead_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (
    organization_id, actor_user_id, entity_type, entity_id, action,
    old_values, new_values
  ) values (
    new.organization_id,
    auth.uid(),
    'lead',
    new.id,
    'updated',
    to_jsonb(old),
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger leads_audit_update
after update on public.leads
for each row when (old is distinct from new)
execute function private.audit_lead_changes();

create or replace function private.record_note_added()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, metadata, source
  ) values (
    new.organization_id,
    new.lead_id,
    new.author_id,
    'note_added',
    jsonb_build_object('note_id', new.id),
    'user'
  );
  update public.leads
    set last_interaction_at = new.created_at
    where id = new.lead_id and organization_id = new.organization_id;
  return new;
end;
$$;

create trigger lead_notes_record_added
after insert on public.lead_notes
for each row execute function private.record_note_added();

-- One transaction creates the tenant, owner membership and useful defaults.
create or replace function public.create_organization_with_defaults(
  p_name text,
  p_slug text
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
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(p_name)) < 2 then
    raise exception 'Organization name is too short';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Invalid organization slug';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), p_slug, v_user_id)
  returning id into v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner');

  insert into public.pipelines (organization_id, name, is_default)
  values (v_organization_id, 'Pipeline comercial', true)
  returning id into v_pipeline_id;

  insert into public.pipeline_stages (
    organization_id, pipeline_id, name, slug, color, position, probability,
    is_closed, is_won
  ) values
    (v_organization_id, v_pipeline_id, 'Novo lead', 'novo-lead', '#64748b', 0, 5, false, false),
    (v_organization_id, v_pipeline_id, 'Clicou no link', 'clicou-no-link', '#0ea5e9', 1, 10, false, false),
    (v_organization_id, v_pipeline_id, 'Cadastro concluído', 'cadastro-concluido', '#3b82f6', 2, 20, false, false),
    (v_organization_id, v_pipeline_id, 'Qualificado', 'qualificado', '#8b5cf6', 3, 40, false, false),
    (v_organization_id, v_pipeline_id, 'Reunião agendada', 'reuniao-agendada', '#a855f7', 4, 55, false, false),
    (v_organization_id, v_pipeline_id, 'Proposta', 'proposta', '#f59e0b', 5, 70, false, false),
    (v_organization_id, v_pipeline_id, 'Negociação', 'negociacao', '#f97316', 6, 85, false, false),
    (v_organization_id, v_pipeline_id, 'Fechado', 'fechado', '#10b981', 7, 100, true, true),
    (v_organization_id, v_pipeline_id, 'Follow-up', 'follow-up', '#ec4899', 8, 35, false, false),
    (v_organization_id, v_pipeline_id, 'Perdido', 'perdido', '#ef4444', 9, 0, true, false);

  insert into public.services (organization_id, name, slug) values
    (v_organization_id, 'Criação de sites', 'criacao-de-sites'),
    (v_organization_id, 'Landing pages', 'landing-pages'),
    (v_organization_id, 'Edição de vídeos', 'edicao-de-videos'),
    (v_organization_id, 'Produção audiovisual', 'producao-audiovisual'),
    (v_organization_id, 'Gestão de tráfego', 'gestao-de-trafego'),
    (v_organization_id, 'Social media', 'social-media'),
    (v_organization_id, 'Automações', 'automacoes'),
    (v_organization_id, 'Inteligência Artificial', 'inteligencia-artificial'),
    (v_organization_id, 'Outro serviço digital', 'outro-servico-digital');

  return v_organization_id;
end;
$$;

revoke all on function public.create_organization_with_defaults(text, text) from public;
grant execute on function public.create_organization_with_defaults(text, text) to authenticated;

-- Atomic stage move: authorization, update and event are inseparable.
create or replace function public.move_lead_stage(
  p_lead_id uuid,
  p_to_stage_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads%rowtype;
  v_from_stage public.pipeline_stages%rowtype;
  v_to_stage public.pipeline_stages%rowtype;
begin
  select * into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found or not private.can_write_org(v_lead.organization_id) then
    raise exception 'Lead not found or access denied';
  end if;

  select * into v_from_stage
  from public.pipeline_stages
  where id = v_lead.stage_id;

  select * into v_to_stage
  from public.pipeline_stages
  where id = p_to_stage_id
    and organization_id = v_lead.organization_id
    and pipeline_id = v_lead.pipeline_id;

  if not found then
    raise exception 'Destination stage is invalid';
  end if;

  if v_lead.stage_id = p_to_stage_id then
    return jsonb_build_object('changed', false, 'lead_id', v_lead.id);
  end if;

  update public.leads
  set stage_id = v_to_stage.id,
      last_interaction_at = now()
  where id = v_lead.id;

  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, metadata, source
  ) values (
    v_lead.organization_id,
    v_lead.id,
    auth.uid(),
    'stage_changed',
    jsonb_build_object(
      'from_stage_id', v_from_stage.id,
      'from_stage_name', v_from_stage.name,
      'to_stage_id', v_to_stage.id,
      'to_stage_name', v_to_stage.name
    ),
    'user'
  );

  return jsonb_build_object(
    'changed', true,
    'lead_id', v_lead.id,
    'from_stage_id', v_from_stage.id,
    'to_stage_id', v_to_stage.id
  );
end;
$$;

revoke all on function public.move_lead_stage(uuid, uuid) from public;
grant execute on function public.move_lead_stage(uuid, uuid) to authenticated;

create or replace function public.get_dashboard_metrics(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not private.is_org_member(p_organization_id) then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'total_leads', count(*),
    'new_leads', count(*) filter (where l.created_at >= now() - interval '30 days'),
    'qualified_leads', count(*) filter (where ps.slug = 'qualificado'),
    'scheduled_meetings', (
      select count(*) from public.meetings m
      where m.organization_id = p_organization_id and m.status = 'scheduled'
    ),
    'proposals_sent', count(*) filter (where ps.slug = 'proposta'),
    'won_deals', count(*) filter (where ps.is_won),
    'conversion_rate', case when count(*) = 0 then 0 else
      round((count(*) filter (where ps.is_won))::numeric * 100 / count(*), 1)
    end,
    'pipeline_value', coalesce(sum(l.estimated_budget) filter (where not ps.is_closed), 0),
    'average_ticket', coalesce(avg(l.estimated_budget) filter (where ps.is_won), 0)
  ) into v_result
  from public.leads l
  join public.pipeline_stages ps on ps.id = l.stage_id
  where l.organization_id = p_organization_id;

  v_result := v_result || jsonb_build_object(
    'stages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ps.id,
          'name', ps.name,
          'color', ps.color,
          'count', coalesce(stage_totals.total, 0)
        ) order by ps.position
      )
      from public.pipeline_stages ps
      join public.pipelines p on p.id = ps.pipeline_id and p.is_default
      left join (
        select stage_id, count(*) as total
        from public.leads
        where organization_id = p_organization_id
        group by stage_id
      ) stage_totals on stage_totals.stage_id = ps.id
      where ps.organization_id = p_organization_id
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('name', source_name, 'count', total))
      from (
        select coalesce(nullif(source, ''), 'Não informado') as source_name,
               count(*) as total
        from public.leads
        where organization_id = p_organization_id
        group by 1
        order by total desc
        limit 6
      ) source_totals
    ), '[]'::jsonb)
  );

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_metrics(uuid) from public;
grant execute on function public.get_dashboard_metrics(uuid) to authenticated;

-- Row Level Security: tenant isolation is enforced by PostgreSQL, not the UI.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_notes enable row level security;
alter table public.tags enable row level security;
alter table public.lead_tags enable row level security;
alter table public.meetings enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_same_org on public.profiles for select
to authenticated using (
  id = auth.uid() or exists (
    select 1
    from public.organization_members me
    join public.organization_members teammate
      on teammate.organization_id = me.organization_id
    where me.user_id = auth.uid() and teammate.user_id = profiles.id
  )
);
create policy profiles_update_self on public.profiles for update
to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select_member on public.organizations for select
to authenticated using (private.is_org_member(id));
create policy organizations_update_admin on public.organizations for update
to authenticated using (private.is_org_admin(id)) with check (private.is_org_admin(id));

create policy organization_members_select_member on public.organization_members for select
to authenticated using (private.is_org_member(organization_id));
create policy organization_members_insert_admin on public.organization_members for insert
to authenticated with check (private.is_org_admin(organization_id));
create policy organization_members_update_admin on public.organization_members for update
to authenticated using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));
create policy organization_members_delete_admin on public.organization_members for delete
to authenticated using (
  private.is_org_admin(organization_id) and user_id <> auth.uid()
);

create policy pipelines_select_member on public.pipelines for select
to authenticated using (private.is_org_member(organization_id));
create policy pipelines_write_member on public.pipelines for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy pipeline_stages_select_member on public.pipeline_stages for select
to authenticated using (private.is_org_member(organization_id));
create policy pipeline_stages_write_member on public.pipeline_stages for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy services_select_member on public.services for select
to authenticated using (private.is_org_member(organization_id));
create policy services_write_member on public.services for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy leads_select_member on public.leads for select
to authenticated using (private.is_org_member(organization_id));
create policy leads_insert_member on public.leads for insert
to authenticated with check (
  private.can_write_org(organization_id) and created_by = auth.uid()
);
create policy leads_update_member on public.leads for update
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));
create policy leads_delete_admin on public.leads for delete
to authenticated using (private.is_org_admin(organization_id));

create policy lead_events_select_member on public.lead_events for select
to authenticated using (private.is_org_member(organization_id));
create policy lead_events_insert_member on public.lead_events for insert
to authenticated with check (
  private.can_write_org(organization_id)
  and (actor_user_id is null or actor_user_id = auth.uid())
);

create policy lead_notes_select_member on public.lead_notes for select
to authenticated using (private.is_org_member(organization_id));
create policy lead_notes_insert_member on public.lead_notes for insert
to authenticated with check (
  private.can_write_org(organization_id) and author_id = auth.uid()
);
create policy lead_notes_update_author on public.lead_notes for update
to authenticated using (author_id = auth.uid() and private.can_write_org(organization_id))
with check (author_id = auth.uid() and private.can_write_org(organization_id));
create policy lead_notes_delete_author_or_admin on public.lead_notes for delete
to authenticated using (author_id = auth.uid() or private.is_org_admin(organization_id));

create policy tags_select_member on public.tags for select
to authenticated using (private.is_org_member(organization_id));
create policy tags_write_member on public.tags for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));
create policy lead_tags_select_member on public.lead_tags for select
to authenticated using (private.is_org_member(organization_id));
create policy lead_tags_write_member on public.lead_tags for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy meetings_select_member on public.meetings for select
to authenticated using (private.is_org_member(organization_id));
create policy meetings_write_member on public.meetings for all
to authenticated using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

-- Webhook ingestion is server-only through a service-role worker after signature validation.
-- No authenticated policies are intentionally created for webhook_events.

create policy audit_logs_select_member on public.audit_logs for select
to authenticated using (private.is_org_member(organization_id));
-- Audit writes happen only through trusted trigger functions.

-- Explicit SQL grants complement RLS. Anonymous users have no domain access.
revoke all on table public.profiles,
  public.organizations,
  public.organization_members,
  public.pipelines,
  public.pipeline_stages,
  public.services,
  public.leads,
  public.lead_events,
  public.lead_notes,
  public.tags,
  public.lead_tags,
  public.meetings,
  public.webhook_events,
  public.audit_logs
from anon;

grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update, delete on public.pipelines to authenticated;
grant select, insert, update, delete on public.pipeline_stages to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert on public.lead_events to authenticated;
grant select, insert, update, delete on public.lead_notes to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.lead_tags to authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
grant select on public.audit_logs to authenticated;
revoke all on table public.webhook_events from authenticated;

-- Trigger functions remain callable only by triggers. Policies may call the
-- three membership helpers explicitly granted below.
revoke execute on all functions in schema private from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.can_write_org(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

comment on table public.lead_events is
  'Append-only business event stream. Never treat it as an editable activity note.';
comment on table public.webhook_events is
  'Durable idempotency inbox. Raw payload access is restricted to trusted server jobs.';
comment on function public.move_lead_stage(uuid, uuid) is
  'Atomically authorizes a manual Kanban move, updates the projection and appends stage_changed.';
