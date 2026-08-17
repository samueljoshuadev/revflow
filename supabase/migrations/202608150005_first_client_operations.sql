-- First-client operations: lead intake, follow-ups, notifications and deterministic Kanban.
-- Incremental: apply after 202608150004_meta_embedded_signup.sql.

begin;

alter table public.leads
  add column if not exists normalized_email text,
  add column if not exists normalized_phone text,
  add column if not exists next_action_at timestamptz,
  add column if not exists first_response_at timestamptz;

create or replace function private.normalize_lead_email(p_value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(lower(trim(coalesce(p_value, ''))), '');
$$;

create or replace function private.normalize_lead_phone(p_value text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_digits text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
begin
  if v_digits = '' then return null; end if;
  if length(v_digits) in (10, 11) then return '55' || v_digits; end if;
  return v_digits;
end;
$$;

create or replace function private.normalize_lead_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.normalized_email := private.normalize_lead_email(new.email);
  new.normalized_phone := private.normalize_lead_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists leads_normalize_identity on public.leads;
create trigger leads_normalize_identity
before insert or update of email, phone on public.leads
for each row execute function private.normalize_lead_identity();

update public.leads
set normalized_email = private.normalize_lead_email(email),
    normalized_phone = private.normalize_lead_phone(phone)
where normalized_email is distinct from private.normalize_lead_email(email)
   or normalized_phone is distinct from private.normalize_lead_phone(phone);

create index if not exists leads_normalized_email_idx
  on public.leads (organization_id, normalized_email)
  where normalized_email is not null and archived_at is null;
create index if not exists leads_normalized_phone_idx
  on public.leads (organization_id, normalized_phone)
  where normalized_phone is not null and archived_at is null;
create index if not exists leads_next_action_due_idx
  on public.leads (organization_id, next_action_at)
  where next_action_at is not null and archived_at is null;

create table public.lead_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_key text not null check (char_length(import_key) between 16 and 120),
  file_name text not null check (char_length(file_name) between 1 and 180),
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  total_rows integer not null default 0 check (total_rows between 0 and 500),
  created_count integer not null default 0 check (created_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  invalid_count integer not null default 0 check (invalid_count >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, import_key),
  unique (id, organization_id)
);

create table public.lead_import_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  import_id uuid not null,
  row_number integer not null check (row_number between 1 and 500),
  status text not null check (status in ('created', 'duplicate', 'invalid')),
  reason text check (reason is null or char_length(reason) <= 240),
  lead_id uuid,
  created_at timestamptz not null default now(),
  foreign key (import_id, organization_id)
    references public.lead_imports(id, organization_id) on delete cascade,
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete set null (lead_id),
  unique (import_id, row_number)
);

create index lead_imports_history_idx
  on public.lead_imports (organization_id, created_at desc);

create table public.lead_capture_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_key text not null check (source_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  channel text not null check (channel in ('form', 'webhook')),
  source_label text not null check (char_length(source_label) between 1 and 100),
  campaign text check (campaign is null or char_length(campaign) <= 160),
  default_service_id uuid,
  default_owner_id uuid,
  token_hash bytea,
  token_hint text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (default_service_id, organization_id)
    references public.services(id, organization_id) on delete set null (default_service_id),
  foreign key (organization_id, default_owner_id)
    references public.organization_members(organization_id, user_id) on delete set null (default_owner_id),
  unique (organization_id, source_key),
  unique (id, organization_id),
  check ((channel = 'webhook' and token_hash is not null) or (channel = 'form' and token_hash is null))
);

create table private.lead_capture_requests (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null,
  idempotency_key text not null,
  identifier_hash bytea not null,
  lead_id uuid,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (source_id, idempotency_key),
  foreign key (source_id, organization_id)
    references public.lead_capture_sources(id, organization_id) on delete cascade,
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete set null (lead_id)
);

create index lead_capture_rate_idx
  on private.lead_capture_requests (source_id, identifier_hash, created_at desc);

create table public.follow_up_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  trigger_kind text not null
    check (trigger_kind in ('first_contact', 'return', 'proposal', 'reactivation', 'stale')),
  delay_days integer not null check (delay_days between 0 and 365),
  notify_in_app boolean not null default true,
  notify_email boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table public.lead_follow_up_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  rule_id uuid not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled')),
  next_run_at timestamptz not null,
  pause_reason text,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade,
  foreign key (rule_id, organization_id)
    references public.follow_up_rules(id, organization_id) on delete cascade,
  unique (organization_id, lead_id, rule_id),
  unique (id, organization_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{1,79}$'),
  title text not null check (char_length(title) between 2 and 160),
  body text not null check (char_length(body) between 2 and 500),
  dedupe_key text not null check (char_length(dedupe_key) between 8 and 240),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (lead_id, organization_id)
    references public.leads(id, organization_id) on delete cascade,
  unique (organization_id, user_id, dedupe_key),
  unique (id, organization_id)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  notification_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'blocked')),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 240),
  attempts integer not null default 0 check (attempts between 0 and 20),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (notification_id, organization_id)
    references public.notifications(id, organization_id) on delete cascade,
  unique (organization_id, channel, idempotency_key)
);

create index follow_up_due_idx
  on public.lead_follow_up_states (status, next_run_at)
  where status = 'active';
create index notifications_user_idx
  on public.notifications (organization_id, user_id, read_at, created_at desc);
create index notification_outbox_pending_idx
  on public.notification_outbox (status, available_at)
  where status in ('pending', 'failed');

create table public.kanban_automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null
    check (event_key in ('lead_created', 'meeting_scheduled', 'meeting_completed', 'proposal_sent', 'proposal_accepted', 'proposal_rejected')),
  target_stage_slug text not null check (target_stage_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, event_key)
);

create or replace function public.import_lead_batch(
  p_organization_id uuid,
  p_import_key text,
  p_file_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_import_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_row jsonb;
  v_row_number integer;
  v_lead_id uuid;
  v_duplicate_id uuid;
  v_email text;
  v_phone text;
  v_name text;
  v_service_id uuid;
  v_owner_id uuid;
  v_created integer := 0;
  v_duplicates integer := 0;
  v_results jsonb := '[]'::jsonb;
begin
  if not private.can_write_org(p_organization_id) then raise exception 'access_denied'; end if;
  if char_length(p_import_key) not between 16 and 120 or
     char_length(trim(p_file_name)) not between 1 and 180 or
     jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'invalid_import';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_organization_id::text || ':import:' || p_import_key, 0)
  );

  select id into v_import_id from public.lead_imports
  where organization_id = p_organization_id and import_key = p_import_key;
  if found then
    return jsonb_build_object(
      'import_id', v_import_id,
      'replayed', true,
      'results', coalesce((select jsonb_agg(jsonb_build_object(
        'row_number', row_number, 'status', status, 'reason', reason, 'lead_id', lead_id
      ) order by row_number) from public.lead_import_items where import_id = v_import_id), '[]'::jsonb)
    );
  end if;

  select p.id into v_pipeline_id from public.pipelines p
  where p.organization_id = p_organization_id and p.is_default limit 1;
  select ps.id into v_stage_id from public.pipeline_stages ps
  where ps.organization_id = p_organization_id and ps.pipeline_id = v_pipeline_id
  order by ps.position limit 1;
  if v_pipeline_id is null or v_stage_id is null then raise exception 'pipeline_not_configured'; end if;

  insert into public.lead_imports (
    organization_id, import_key, file_name, total_rows, created_by
  ) values (
    p_organization_id, p_import_key, left(trim(p_file_name), 180), jsonb_array_length(p_rows), auth.uid()
  ) returning id into v_import_id;

  for v_row, v_row_number in
    select value, coalesce(nullif(value ->> 'row_number', '')::integer, ordinality::integer)
    from jsonb_array_elements(p_rows) with ordinality
  loop
    if v_row_number not between 1 and 500 then raise exception 'invalid_row_number'; end if;
    v_name := trim(coalesce(v_row ->> 'name', ''));
    v_email := private.normalize_lead_email(v_row ->> 'email');
    v_phone := private.normalize_lead_phone(v_row ->> 'phone');
    v_service_id := nullif(v_row ->> 'service_id', '')::uuid;
    v_owner_id := nullif(v_row ->> 'owner_id', '')::uuid;

    if char_length(v_name) not between 2 and 160 or
       (v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')) or
       (v_row ->> 'phone' is not null and char_length(v_row ->> 'phone') > 40) then
      insert into public.lead_import_items (organization_id, import_id, row_number, status, reason)
      values (p_organization_id, v_import_id, v_row_number, 'invalid', 'Dados inválidos após validação.');
      v_results := v_results || jsonb_build_array(jsonb_build_object('row_number', v_row_number, 'status', 'invalid', 'reason', 'Dados inválidos após validação.'));
      continue;
    end if;
    if v_service_id is not null and not exists (
      select 1 from public.services where id = v_service_id and organization_id = p_organization_id
    ) then raise exception 'invalid_service'; end if;
    if v_owner_id is not null and not exists (
      select 1 from public.organization_members where user_id = v_owner_id and organization_id = p_organization_id
    ) then raise exception 'invalid_owner'; end if;

    if v_email is not null then
      perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':email:' || v_email, 0));
    end if;
    if v_phone is not null then
      perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':phone:' || v_phone, 0));
    end if;
    select id into v_duplicate_id from public.leads
    where organization_id = p_organization_id and archived_at is null
      and ((v_email is not null and normalized_email = v_email)
        or (v_phone is not null and normalized_phone = v_phone))
    order by created_at limit 1;
    if found then
      insert into public.lead_import_items (organization_id, import_id, row_number, status, reason, lead_id)
      values (p_organization_id, v_import_id, v_row_number, 'duplicate', 'Telefone ou e-mail já cadastrado.', v_duplicate_id);
      v_duplicates := v_duplicates + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object('row_number', v_row_number, 'status', 'duplicate', 'reason', 'Telefone ou e-mail já cadastrado.'));
      continue;
    end if;

    insert into public.leads (
      organization_id, pipeline_id, stage_id, service_id, owner_id, name,
      email, phone, company, source, campaign, estimated_budget, priority,
      summary, next_action, next_action_at, created_by, custom_fields
    ) values (
      p_organization_id, v_pipeline_id, v_stage_id, v_service_id, coalesce(v_owner_id, auth.uid()), v_name,
      nullif(trim(v_row ->> 'email'), ''), nullif(trim(v_row ->> 'phone'), ''),
      nullif(trim(v_row ->> 'company'), ''), left(nullif(trim(v_row ->> 'source'), ''), 100),
      left(nullif(trim(v_row ->> 'campaign'), ''), 160),
      case when jsonb_typeof(v_row -> 'estimated_budget') = 'number' then (v_row ->> 'estimated_budget')::numeric else null end,
      coalesce(nullif(v_row ->> 'priority', '')::public.lead_priority, 'medium'),
      left(nullif(trim(v_row ->> 'summary'), ''), 2000), left(nullif(trim(v_row ->> 'next_action'), ''), 500),
      nullif(v_row ->> 'next_action_at', '')::timestamptz, auth.uid(), '{}'::jsonb
    ) returning id into v_lead_id;

    insert into public.lead_events (
      organization_id, lead_id, actor_user_id, event_type, metadata, source, idempotency_key
    ) values (
      p_organization_id, v_lead_id, auth.uid(), 'lead_imported',
      jsonb_build_object('import_id', v_import_id, 'row_number', v_row_number),
      'api', 'lead_import:' || v_import_id::text || ':' || v_row_number::text
    );
    insert into public.lead_import_items (organization_id, import_id, row_number, status, lead_id)
    values (p_organization_id, v_import_id, v_row_number, 'created', v_lead_id);
    v_created := v_created + 1;
    v_results := v_results || jsonb_build_array(jsonb_build_object('row_number', v_row_number, 'status', 'created', 'lead_id', v_lead_id));
  end loop;

  update public.lead_imports set
    status = 'completed', created_count = v_created, duplicate_count = v_duplicates,
    invalid_count = jsonb_array_length(p_rows) - v_created - v_duplicates,
    completed_at = now()
  where id = v_import_id;
  return jsonb_build_object('import_id', v_import_id, 'replayed', false, 'results', v_results);
end;
$$;

create or replace function public.get_public_lead_capture_profile(p_organization_slug text, p_source_key text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'organization_name', o.name, 'organization_slug', o.slug,
    'source_name', s.name, 'source_key', s.source_key
  )
  from public.lead_capture_sources s
  join public.organizations o on o.id = s.organization_id
  where o.slug = p_organization_slug and s.source_key = p_source_key
    and s.channel = 'form' and s.is_active;
$$;

create or replace function public.capture_external_lead(
  p_organization_slug text,
  p_source_key text,
  p_channel text,
  p_token text,
  p_idempotency_key text,
  p_identifier text,
  p_name text,
  p_email text,
  p_phone text,
  p_company text default null,
  p_summary text default null,
  p_website text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_source public.lead_capture_sources%rowtype;
  v_org_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_lead_id uuid;
  v_duplicate_id uuid;
  v_identifier_hash bytea;
  v_email text := private.normalize_lead_email(p_email);
  v_phone text := private.normalize_lead_phone(p_phone);
  v_response jsonb;
  v_limit integer;
  v_global_limit integer;
begin
  if coalesce(trim(p_website), '') <> '' then return jsonb_build_object('accepted', true); end if;
  if p_channel not in ('form', 'webhook') or char_length(p_idempotency_key) not between 16 and 160 or
     char_length(trim(coalesce(p_identifier, ''))) not between 3 and 240 or
     char_length(trim(coalesce(p_name, ''))) not between 2 and 160 or
     (v_email is null and v_phone is null) or char_length(coalesce(p_summary, '')) > 2000 then
    raise exception 'invalid_intake';
  end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') then
    raise exception 'invalid_intake';
  end if;
  select s.* into v_source
  from public.lead_capture_sources s join public.organizations o on o.id = s.organization_id
  where o.slug = p_organization_slug and s.source_key = p_source_key
    and s.channel = p_channel and s.is_active;
  if not found then raise exception 'intake_not_found'; end if;
  v_org_id := v_source.organization_id;
  if p_channel = 'webhook' and (
    p_token is null or not digest(p_token, 'sha256') = v_source.token_hash
  ) then raise exception 'invalid_intake_token'; end if;

  select response into v_response from private.lead_capture_requests
  where source_id = v_source.id and idempotency_key = p_idempotency_key;
  if found then return v_response || jsonb_build_object('replayed', true); end if;

  v_identifier_hash := digest(v_source.id::text || ':' || lower(trim(p_identifier)), 'sha256');
  v_limit := case when p_channel = 'form' then 5 else 120 end;
  v_global_limit := case when p_channel = 'form' then 100 else 1000 end;
  if (select count(*) from private.lead_capture_requests
      where source_id = v_source.id and created_at > now() - interval '1 hour') >=
      v_global_limit then
    raise exception 'intake_rate_limited';
  end if;
  if (select count(*) from private.lead_capture_requests
      where source_id = v_source.id and identifier_hash = v_identifier_hash
        and created_at > now() - interval '1 hour') >= v_limit then
    raise exception 'intake_rate_limited';
  end if;

  select id into v_pipeline_id from public.pipelines
  where organization_id = v_org_id and is_default limit 1;
  select id into v_stage_id from public.pipeline_stages
  where organization_id = v_org_id and pipeline_id = v_pipeline_id order by position limit 1;
  if v_stage_id is null then raise exception 'pipeline_not_configured'; end if;

  if v_email is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_org_id::text || ':email:' || v_email, 0));
  end if;
  if v_phone is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_org_id::text || ':phone:' || v_phone, 0));
  end if;
  select id into v_duplicate_id from public.leads
  where organization_id = v_org_id and archived_at is null
    and ((v_email is not null and normalized_email = v_email)
      or (v_phone is not null and normalized_phone = v_phone))
  order by created_at limit 1;

  if v_duplicate_id is null then
    insert into public.leads (
      organization_id, pipeline_id, stage_id, service_id, owner_id, name,
      email, phone, company, source, campaign, summary, priority, score,
      created_by, custom_fields
    ) values (
      v_org_id, v_pipeline_id, v_stage_id, v_source.default_service_id,
      v_source.default_owner_id, trim(p_name), nullif(trim(p_email), ''),
      nullif(trim(p_phone), ''), left(nullif(trim(p_company), ''), 160),
      v_source.source_label, v_source.campaign, nullif(trim(p_summary), ''),
      'medium', 0, null, '{}'::jsonb
    ) returning id into v_lead_id;
    insert into public.lead_events (
      organization_id, lead_id, event_type, metadata, source, idempotency_key
    ) values (
      v_org_id, v_lead_id, 'lead_captured', jsonb_build_object('capture_source_id', v_source.id, 'channel', p_channel),
      case when p_channel = 'webhook' then 'webhook'::public.event_source else 'api'::public.event_source end,
      'lead_capture:' || v_source.id::text || ':' || p_idempotency_key
    );
    v_response := jsonb_build_object('accepted', true, 'duplicate', false);
  else
    v_lead_id := v_duplicate_id;
    v_response := jsonb_build_object('accepted', true, 'duplicate', true);
  end if;

  insert into private.lead_capture_requests (
    organization_id, source_id, idempotency_key, identifier_hash, lead_id, response
  ) values (v_org_id, v_source.id, p_idempotency_key, v_identifier_hash, v_lead_id, v_response);
  return v_response || jsonb_build_object('replayed', false);
end;
$$;

create or replace function private.apply_kanban_automation(
  p_organization_id uuid,
  p_lead_id uuid,
  p_event_key text,
  p_idempotency_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads%rowtype;
  v_stage public.pipeline_stages%rowtype;
  v_from_stage_id uuid;
begin
  select * into v_lead from public.leads
  where id = p_lead_id and organization_id = p_organization_id for update;
  if not found then return false; end if;
  select ps.* into v_stage
  from public.kanban_automation_rules r
  join public.pipeline_stages ps on ps.organization_id = r.organization_id
    and ps.pipeline_id = v_lead.pipeline_id and ps.slug = r.target_stage_slug
  where r.organization_id = p_organization_id and r.event_key = p_event_key and r.is_active;
  if not found or v_lead.stage_id = v_stage.id then return false; end if;
  if exists (select 1 from public.lead_events where organization_id = p_organization_id
    and source = 'automation' and idempotency_key = p_idempotency_key) then return false; end if;
  v_from_stage_id := v_lead.stage_id;
  update public.leads set stage_id = v_stage.id, last_interaction_at = now() where id = v_lead.id;
  insert into public.lead_events (
    organization_id, lead_id, event_type, metadata, source, idempotency_key
  ) values (
    p_organization_id, p_lead_id, 'stage_changed',
    jsonb_build_object('from_stage_id', v_from_stage_id, 'to_stage_id', v_stage.id, 'automation_event', p_event_key),
    'automation', p_idempotency_key
  );
  return true;
end;
$$;

create or replace function private.automate_meeting_stage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'scheduled' then
    perform private.apply_kanban_automation(new.organization_id, new.lead_id, 'meeting_scheduled', 'meeting_scheduled:' || new.id::text);
    update public.lead_follow_up_states set status = 'paused', pause_reason = 'meeting_scheduled', updated_at = now()
    where organization_id = new.organization_id and lead_id = new.lead_id and status = 'active';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'completed' then
    perform private.apply_kanban_automation(new.organization_id, new.lead_id, 'meeting_completed', 'meeting_completed:' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists meetings_automate_stage on public.meetings;
create trigger meetings_automate_stage after insert or update of status on public.meetings
for each row execute function private.automate_meeting_stage();

create or replace function private.automate_proposal_stage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_key text;
begin
  if new.lead_id is null or (tg_op = 'UPDATE' and old.status = new.status) then return new; end if;
  v_event_key := case new.status when 'sent' then 'proposal_sent' when 'accepted' then 'proposal_accepted'
    when 'rejected' then 'proposal_rejected' else null end;
  if v_event_key is not null then
    insert into public.lead_events (organization_id, lead_id, actor_user_id, event_type, metadata, source, idempotency_key)
    values (new.organization_id, new.lead_id, auth.uid(), v_event_key,
      jsonb_build_object('proposal_id', new.id), 'user', v_event_key || ':' || new.id::text)
    on conflict (organization_id, source, idempotency_key) where idempotency_key is not null do nothing;
    perform private.apply_kanban_automation(new.organization_id, new.lead_id, v_event_key, 'kanban:' || v_event_key || ':' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists proposals_automate_stage on public.proposals;
create trigger proposals_automate_stage after insert or update of status on public.proposals
for each row execute function private.automate_proposal_stage();

create or replace function private.pause_followups_on_closed_lead()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.stage_id is distinct from new.stage_id and exists (
    select 1 from public.pipeline_stages where id = new.stage_id and is_closed
  ) then
    update public.lead_follow_up_states set status = 'completed', pause_reason = 'lead_closed', updated_at = now()
    where organization_id = new.organization_id and lead_id = new.id and status in ('active', 'paused');
  end if;
  return new;
end;
$$;

drop trigger if exists leads_pause_followups_when_closed on public.leads;
create trigger leads_pause_followups_when_closed after update of stage_id on public.leads
for each row execute function private.pause_followups_on_closed_lead();

create or replace function public.set_lead_next_action(
  p_organization_id uuid, p_lead_id uuid, p_action text, p_due_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.can_write_org(p_organization_id) or char_length(trim(coalesce(p_action, ''))) not between 2 and 500 then
    raise exception 'invalid_next_action';
  end if;
  update public.leads set next_action = trim(p_action), next_action_at = p_due_at
  where id = p_lead_id and organization_id = p_organization_id;
  if not found then raise exception 'lead_not_found'; end if;
  insert into public.lead_events (organization_id, lead_id, actor_user_id, event_type, metadata, source)
  values (p_organization_id, p_lead_id, auth.uid(), 'next_action_scheduled', jsonb_build_object('due_at', p_due_at), 'user');
end;
$$;

create or replace function public.clear_lead_next_action(
  p_organization_id uuid, p_lead_id uuid, p_outcome text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.can_write_org(p_organization_id)
    or p_outcome not in ('completed', 'cancelled') then
    raise exception 'invalid_next_action_outcome';
  end if;
  update public.leads set next_action = null, next_action_at = null,
    last_interaction_at = case when p_outcome = 'completed' then now() else last_interaction_at end
  where id = p_lead_id and organization_id = p_organization_id;
  if not found then raise exception 'lead_not_found'; end if;
  insert into public.lead_events (organization_id, lead_id, actor_user_id, event_type, metadata, source)
  values (p_organization_id, p_lead_id, auth.uid(), 'next_action_' || p_outcome, '{}'::jsonb, 'user');
end;
$$;

create or replace function private.record_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.lead_id is not null and old.status is distinct from new.status
    and new.status in ('completed', 'cancelled') then
    insert into public.lead_events (
      organization_id, lead_id, actor_user_id, event_type, metadata, source,
      idempotency_key
    ) values (
      new.organization_id, new.lead_id, auth.uid(), 'task_' || new.status,
      jsonb_build_object('task_id', new.id, 'title', new.title), 'user',
      'task:' || new.id::text || ':' || new.status
    ) on conflict (organization_id, source, idempotency_key)
      where idempotency_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_record_status_change on public.tasks;
create trigger tasks_record_status_change after update of status on public.tasks
for each row execute function private.record_task_status_change();

create or replace function public.process_due_followups(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_notification_id uuid;
  v_processed integer := 0;
  v_due_at timestamptz;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  p_limit := greatest(1, least(p_limit, 500));

  insert into public.lead_follow_up_states (organization_id, lead_id, rule_id, next_run_at)
  select l.organization_id, l.id, r.id,
    case r.trigger_kind
      when 'return' then coalesce(l.next_action_at, l.updated_at + make_interval(days => r.delay_days))
      when 'first_contact' then l.created_at + make_interval(days => r.delay_days)
      else coalesce(l.last_interaction_at, l.updated_at) + make_interval(days => r.delay_days)
    end
  from public.leads l
  join public.pipeline_stages ps on ps.id = l.stage_id and not ps.is_closed
  join public.follow_up_rules r on r.organization_id = l.organization_id and r.is_active
  where l.archived_at is null
    and (r.trigger_kind <> 'first_contact' or l.first_response_at is null)
    and (r.trigger_kind <> 'return' or l.next_action_at is not null)
    and (r.trigger_kind <> 'proposal' or ps.slug = 'proposta')
  on conflict (organization_id, lead_id, rule_id) do nothing;

  for v_item in
    select s.*, r.name as rule_name, r.notify_email,
      coalesce(l.owner_id, l.created_by, (
        select om.user_id from public.organization_members om
        where om.organization_id = l.organization_id and om.role = 'owner'
        order by om.created_at limit 1
      )) as recipient_user_id
    from public.lead_follow_up_states s
    join public.follow_up_rules r on r.id = s.rule_id and r.organization_id = s.organization_id
    join public.leads l on l.id = s.lead_id and l.organization_id = s.organization_id
    where s.status = 'active' and s.next_run_at <= now()
    order by s.next_run_at for update of s skip locked limit p_limit
  loop
    v_notification_id := null;
    insert into public.notifications (
      organization_id, user_id, lead_id, kind, title, body, dedupe_key
    ) values (
      v_item.organization_id, v_item.recipient_user_id, v_item.lead_id,
      'follow_up_due', 'Acompanhamento pendente',
      'Um lead precisa da próxima ação comercial.',
      'follow_up:' || v_item.id::text || ':' || to_char(v_item.next_run_at at time zone 'UTC', 'YYYYMMDDHH24MI')
    ) on conflict (organization_id, user_id, dedupe_key) do nothing returning id into v_notification_id;
    if v_notification_id is not null and v_item.notify_email then
      insert into public.notification_outbox (organization_id, notification_id, user_id, channel, idempotency_key)
      values (v_item.organization_id, v_notification_id, v_item.recipient_user_id, 'email',
        'follow_up:' || v_item.id::text || ':' || to_char(v_item.next_run_at at time zone 'UTC', 'YYYYMMDDHH24MI'))
      on conflict do nothing;
    end if;
    update public.lead_follow_up_states set last_notified_at = now(), status = 'paused', pause_reason = 'notification_sent', updated_at = now()
    where id = v_item.id;
    v_processed := v_processed + 1;
  end loop;
  return jsonb_build_object('processed', v_processed);
end;
$$;

create or replace function public.claim_notification_outbox(p_limit integer default 50)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  return query
  with claimed as (
    select id from public.notification_outbox
    where status in ('pending', 'failed') and available_at <= now() and attempts < 20
    order by available_at, created_at
    for update skip locked limit greatest(1, least(p_limit, 100))
  )
  update public.notification_outbox o set status = 'processing', attempts = attempts + 1
  from claimed where o.id = claimed.id returning o.*;
end;
$$;

create or replace function public.complete_notification_delivery(
  p_outbox_id uuid, p_status text, p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' or p_status not in ('sent', 'failed', 'blocked') then
    raise exception 'service_role_required';
  end if;
  update public.notification_outbox set status = p_status,
    sent_at = case when p_status = 'sent' then now() else null end,
    last_error = case when p_status = 'sent' then null else left(coalesce(p_error, 'delivery_failed'), 160) end,
    available_at = case when p_status = 'failed' then now() + make_interval(mins => least(attempts * 5, 60)) else available_at end
  where id = p_outbox_id and status = 'processing';
end;
$$;

create or replace function private.seed_kanban_rule_for_stage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_key text;
begin
  v_event_key := case new.slug
    when 'novo-lead' then 'lead_created'
    when 'reuniao-agendada' then 'meeting_scheduled'
    when 'reuniao-realizada' then 'meeting_completed'
    when 'proposta' then 'proposal_sent'
    when 'fechado' then 'proposal_accepted'
    when 'fechado-ganho' then 'proposal_accepted'
    when 'perdido' then 'proposal_rejected'
    when 'fechado-perdido' then 'proposal_rejected'
    else null
  end;
  if v_event_key is not null then
    insert into public.kanban_automation_rules (organization_id, event_key, target_stage_slug)
    values (new.organization_id, v_event_key, new.slug)
    on conflict (organization_id, event_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists pipeline_stages_seed_kanban_rule on public.pipeline_stages;
create trigger pipeline_stages_seed_kanban_rule after insert on public.pipeline_stages
for each row execute function private.seed_kanban_rule_for_stage();

create or replace function private.pause_followups_on_human_contact()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead_id uuid;
  v_organization_id uuid;
begin
  if tg_table_name = 'lead_notes' then
    v_lead_id := new.lead_id;
    v_organization_id := new.organization_id;
  else
    if new.direction <> 'inbound' then return new; end if;
    select c.lead_id, c.organization_id into v_lead_id, v_organization_id
    from public.conversations c
    where c.id = new.conversation_id and c.organization_id = new.organization_id;
  end if;
  if v_lead_id is not null then
    update public.leads set first_response_at = coalesce(first_response_at, now()), last_interaction_at = now()
    where id = v_lead_id and organization_id = v_organization_id;
    update public.lead_follow_up_states set status = 'paused', pause_reason = 'contact_registered', updated_at = now()
    where lead_id = v_lead_id and organization_id = v_organization_id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists lead_notes_pause_followups on public.lead_notes;
create trigger lead_notes_pause_followups after insert on public.lead_notes
for each row execute function private.pause_followups_on_human_contact();
drop trigger if exists messages_pause_followups on public.messages;
create trigger messages_pause_followups after insert on public.messages
for each row execute function private.pause_followups_on_human_contact();

-- Seed only deterministic configuration that matches stages already present.
insert into public.kanban_automation_rules (organization_id, event_key, target_stage_slug)
select o.id, x.event_key, x.slug
from public.organizations o
cross join lateral (values
  ('lead_created', 'novo-lead'),
  ('meeting_scheduled', 'reuniao-agendada'),
  ('meeting_completed', 'reuniao-realizada'),
  ('proposal_sent', 'proposta'),
  ('proposal_accepted', case when o.vertical = 'real_estate' then 'fechado-ganho' else 'fechado' end),
  ('proposal_rejected', case when o.vertical = 'real_estate' then 'fechado-perdido' else 'perdido' end)
) as x(event_key, slug)
where exists (select 1 from public.pipeline_stages ps where ps.organization_id = o.id and ps.slug = x.slug)
on conflict (organization_id, event_key) do nothing;

alter table public.lead_imports enable row level security;
alter table public.lead_import_items enable row level security;
alter table public.lead_capture_sources enable row level security;
alter table public.follow_up_rules enable row level security;
alter table public.lead_follow_up_states enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.kanban_automation_rules enable row level security;

create policy lead_imports_select_member on public.lead_imports for select to authenticated
using (private.is_org_member(organization_id));
create policy lead_import_items_select_member on public.lead_import_items for select to authenticated
using (private.is_org_member(organization_id));
create policy capture_sources_select_member on public.lead_capture_sources for select to authenticated
using (private.is_org_member(organization_id));
create policy capture_sources_write_admin on public.lead_capture_sources for all to authenticated
using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy follow_up_rules_select_member on public.follow_up_rules for select to authenticated
using (private.is_org_member(organization_id));
create policy follow_up_rules_write_admin on public.follow_up_rules for all to authenticated
using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));
create policy follow_up_states_select_member on public.lead_follow_up_states for select to authenticated
using (private.is_org_member(organization_id));
create policy follow_up_states_write_member on public.lead_follow_up_states for update to authenticated
using (private.can_write_org(organization_id)) with check (private.can_write_org(organization_id));
create policy notifications_select_recipient on public.notifications for select to authenticated
using (private.is_org_member(organization_id) and user_id = auth.uid());
create policy notifications_update_recipient on public.notifications for update to authenticated
using (private.is_org_member(organization_id) and user_id = auth.uid())
with check (private.is_org_member(organization_id) and user_id = auth.uid());
create policy kanban_rules_select_member on public.kanban_automation_rules for select to authenticated
using (private.is_org_member(organization_id));
create policy kanban_rules_write_admin on public.kanban_automation_rules for all to authenticated
using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));

revoke all on public.lead_imports, public.lead_import_items, public.lead_capture_sources,
  public.follow_up_rules, public.lead_follow_up_states, public.notifications,
  public.notification_outbox, public.kanban_automation_rules from anon;
grant select on public.lead_imports, public.lead_import_items to authenticated;
grant select, insert, update, delete on public.lead_capture_sources, public.follow_up_rules,
  public.kanban_automation_rules to authenticated;
grant select, update on public.lead_follow_up_states, public.notifications to authenticated;
revoke all on public.notification_outbox from authenticated;
revoke all on private.lead_capture_requests from public, anon, authenticated;

revoke all on function public.import_lead_batch(uuid, text, text, jsonb) from public;
grant execute on function public.import_lead_batch(uuid, text, text, jsonb) to authenticated;
revoke all on function public.get_public_lead_capture_profile(text, text) from public;
grant execute on function public.get_public_lead_capture_profile(text, text) to anon, authenticated;
revoke all on function public.capture_external_lead(text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.capture_external_lead(text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.set_lead_next_action(uuid, uuid, text, timestamptz) from public;
grant execute on function public.set_lead_next_action(uuid, uuid, text, timestamptz) to authenticated;
revoke all on function public.clear_lead_next_action(uuid, uuid, text) from public;
grant execute on function public.clear_lead_next_action(uuid, uuid, text) to authenticated;
revoke all on function public.process_due_followups(integer) from public, anon, authenticated;
grant execute on function public.process_due_followups(integer) to service_role;
revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;
revoke all on function public.complete_notification_delivery(uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_notification_delivery(uuid, text, text) to service_role;
revoke all on function private.normalize_lead_email(text) from public, anon, authenticated;
revoke all on function private.normalize_lead_phone(text) from public, anon, authenticated;
revoke all on function private.normalize_lead_identity() from public, anon, authenticated;
revoke all on function private.apply_kanban_automation(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function private.automate_meeting_stage() from public, anon, authenticated;
revoke all on function private.automate_proposal_stage() from public, anon, authenticated;
revoke all on function private.pause_followups_on_closed_lead() from public, anon, authenticated;
revoke all on function private.seed_kanban_rule_for_stage() from public, anon, authenticated;
revoke all on function private.pause_followups_on_human_contact() from public, anon, authenticated;
revoke all on function private.record_task_status_change() from public, anon, authenticated;

create trigger lead_capture_sources_touch_updated_at before update on public.lead_capture_sources
for each row execute function private.touch_updated_at();
create trigger follow_up_rules_touch_updated_at before update on public.follow_up_rules
for each row execute function private.touch_updated_at();
create trigger follow_up_states_touch_updated_at before update on public.lead_follow_up_states
for each row execute function private.touch_updated_at();
create trigger notification_outbox_touch_updated_at before update on public.notification_outbox
for each row execute function private.touch_updated_at();
create trigger kanban_rules_touch_updated_at before update on public.kanban_automation_rules
for each row execute function private.touch_updated_at();

comment on function public.import_lead_batch(uuid, text, text, jsonb) is
  'Idempotent tenant-scoped CSV intake. Raw files are never persisted.';
comment on function public.capture_external_lead(text, text, text, text, text, text, text, text, text, text, text, text) is
  'Validated public form/webhook boundary with hashed tokens, throttling and idempotency.';
comment on table public.notification_outbox is
  'Server-only delivery queue. A notification is never marked sent without provider confirmation.';

commit;
