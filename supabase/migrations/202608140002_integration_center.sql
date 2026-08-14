begin;

alter table public.integration_connections
  drop constraint if exists integration_connections_provider_check;
alter table public.integration_connections
  add constraint integration_connections_provider_check
  check (provider in ('openai', 'google_calendar', 'calendly', 'whatsapp'));

alter table public.integration_connections
  drop constraint if exists integration_connections_status_check;
alter table public.integration_connections
  add constraint integration_connections_status_check
  check (status in (
    'disconnected', 'incomplete', 'pending', 'connecting', 'connected',
    'attention', 'expired', 'error', 'revoked'
  ));

alter table public.integration_connections
  add column if not exists last_tested_at timestamptz,
  add column if not exists last_event_at timestamptz,
  add column if not exists diagnostic_id uuid not null default gen_random_uuid();

create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('openai', 'google_calendar', 'calendly', 'whatsapp')),
  encrypted_payload text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null default 1 check (key_version > 0),
  secret_hint text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid,
  provider text not null check (provider in ('openai', 'google_calendar', 'calendly', 'whatsapp')),
  event_type text not null,
  status text not null check (status in ('success', 'warning', 'error')),
  error_code text,
  diagnostic_id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  foreign key (connection_id, organization_id)
    references public.integration_connections(id, organization_id) on delete set null (connection_id),
  check (char_length(event_type) between 2 and 80),
  check (error_code is null or char_length(error_code) <= 100)
);

create index integration_events_org_occurred_idx
  on public.integration_events (organization_id, occurred_at desc);
create index integration_events_connection_occurred_idx
  on public.integration_events (connection_id, occurred_at desc)
  where connection_id is not null;

create trigger integration_credentials_touch_updated_at
before update on public.integration_credentials
for each row execute function private.touch_updated_at();

create or replace function private.reject_integration_secrets_in_config()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  forbidden_key text;
begin
  select key into forbidden_key
  from jsonb_object_keys(coalesce(new.config, '{}'::jsonb)) as key
  where lower(key) in (
    'access_token', 'refresh_token', 'api_key', 'app_secret',
    'client_secret', 'webhook_secret', 'verify_token'
  )
  limit 1;

  if forbidden_key is not null then
    raise exception 'sensitive integration value cannot be stored in config';
  end if;
  return new;
end;
$$;

drop trigger if exists integration_connections_reject_secrets
  on public.integration_connections;
create trigger integration_connections_reject_secrets
before insert or update of config on public.integration_connections
for each row execute function private.reject_integration_secrets_in_config();

alter table public.integration_credentials enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists integration_connections_select_admin
  on public.integration_connections;
create policy integration_connections_select_member
on public.integration_connections for select
to authenticated
using (private.is_org_member(organization_id));

create policy integration_credentials_admin_all
on public.integration_credentials for all
to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));

create policy integration_events_admin_select
on public.integration_events for select
to authenticated
using (private.is_org_admin(organization_id));

revoke all on table public.integration_credentials, public.integration_events
  from anon;
grant select, insert, update, delete on public.integration_credentials
  to authenticated;
grant select on public.integration_events to authenticated;

revoke execute on function private.reject_integration_secrets_in_config()
  from public, anon, authenticated;

comment on table public.integration_credentials is
  'AES-GCM ciphertext only. Plain provider credentials never belong in PostgreSQL, logs or browser responses.';
comment on table public.integration_events is
  'Sanitized operational diagnostics. Payloads, messages, tokens and PII are intentionally excluded.';

create or replace function public.apply_lead_ai_analysis(
  p_organization_id uuid,
  p_lead_id uuid,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_result jsonb,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_analysis_id uuid;
  v_score integer;
  v_priority text;
begin
  if not private.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  if not exists (
    select 1 from public.leads
    where id = p_lead_id and organization_id = p_organization_id
  ) then
    raise exception 'lead_not_found';
  end if;

  v_score := (p_result ->> 'score')::integer;
  v_priority := p_result ->> 'priority';
  if v_score not between 0 and 100
    or v_priority not in ('low', 'medium', 'high', 'urgent')
    or nullif(trim(p_result ->> 'summary'), '') is null
    or nullif(trim(p_result ->> 'next_action'), '') is null then
    raise exception 'invalid_ai_result';
  end if;

  insert into public.ai_analyses (
    organization_id, lead_id, requested_by, status, provider, model,
    prompt_version, schema_version, result, input_tokens, output_tokens
  ) values (
    p_organization_id, p_lead_id, auth.uid(), 'completed', 'openai', p_model,
    p_prompt_version, p_schema_version, p_result, p_input_tokens, p_output_tokens
  ) returning id into v_analysis_id;

  update public.leads
  set score = v_score,
      priority = v_priority::public.lead_priority,
      summary = p_result ->> 'summary',
      next_action = p_result ->> 'next_action',
      qualified_at = now(),
      ai_status = 'analyzed'
  where id = p_lead_id and organization_id = p_organization_id;

  insert into public.lead_events (
    organization_id, lead_id, actor_user_id, event_type, source, metadata
  ) values (
    p_organization_id, p_lead_id, auth.uid(), 'lead_analyzed', 'ai',
    jsonb_build_object(
      'analysis_id', v_analysis_id,
      'model', p_model,
      'schema_version', p_schema_version,
      'score', v_score,
      'priority', v_priority
    )
  );
  return v_analysis_id;
end;
$$;

revoke all on function public.apply_lead_ai_analysis(
  uuid, uuid, text, text, text, jsonb, integer, integer
) from public, anon;
grant execute on function public.apply_lead_ai_analysis(
  uuid, uuid, text, text, text, jsonb, integer, integer
) to authenticated;

commit;
