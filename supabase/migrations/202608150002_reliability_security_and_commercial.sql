-- Reliability, authorization and commercial foundations.
-- Incremental: apply only after the migrations already committed to this repository.

begin;

-- PostgreSQL UNIQUE NULLS NOT DISTINCT treats two nulls as equal. The original
-- constraints were appropriate only for provider identifiers, not manual records.
-- Resolve the actual constraint names from the catalog instead of assuming them.
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    join (
      select constraint_schema, constraint_name, table_name,
             array_agg(column_name::text order by ordinal_position) as columns
      from information_schema.key_column_usage
      where table_schema = 'public'
      group by constraint_schema, constraint_name, table_name
    ) kcu using (constraint_schema, constraint_name, table_name)
    where tc.table_schema = 'public'
      and tc.constraint_type = 'UNIQUE'
      and (
        (tc.table_name = 'meetings' and kcu.columns = array['organization_id', 'external_provider', 'external_id'])
        or (tc.table_name = 'clients' and kcu.columns = array['organization_id', 'source_lead_id'])
        or (tc.table_name = 'projects' and kcu.columns = array['organization_id', 'proposal_id'])
        or (tc.table_name = 'messages' and kcu.columns = array['organization_id', 'external_id'])
      )
  loop
    execute format(
      'alter table public.%I drop constraint %I',
      v_constraint.table_name,
      v_constraint.constraint_name
    );
  end loop;
end;
$$;

create unique index if not exists meetings_provider_external_id_uk
  on public.meetings (organization_id, external_provider, external_id)
  where external_provider is not null and external_id is not null;
create unique index if not exists clients_source_lead_uk
  on public.clients (organization_id, source_lead_id)
  where source_lead_id is not null;
create unique index if not exists projects_proposal_uk
  on public.projects (organization_id, proposal_id)
  where proposal_id is not null;
create unique index if not exists messages_external_id_uk
  on public.messages (organization_id, external_id)
  where external_id is not null;

-- The role policies in the original foundation allowed an admin to directly
-- promote themselves. Membership mutations now go exclusively through these
-- audited security-definer functions.
create or replace function private.is_org_owner(p_organization_id uuid)
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
      and role = 'owner'
  );
$$;

revoke all on function private.is_org_owner(uuid) from public;
grant execute on function private.is_org_owner(uuid) to authenticated;

drop policy if exists organization_members_insert_admin on public.organization_members;
drop policy if exists organization_members_update_admin on public.organization_members;
drop policy if exists organization_members_delete_admin on public.organization_members;

revoke insert, update, delete on public.organization_members from authenticated;
grant select on public.organization_members to authenticated;

drop policy if exists invitations_insert_admin on public.organization_invitations;
create policy invitations_insert_admin
on public.organization_invitations for insert
to authenticated
with check (
  private.is_org_admin(organization_id)
  and invited_by = auth.uid()
  and (role <> 'owner' or private.is_org_owner(organization_id))
);

drop policy if exists invitations_update_admin on public.organization_invitations;
create policy invitations_update_admin
on public.organization_invitations for update
to authenticated
using (private.is_org_admin(organization_id))
with check (
  private.is_org_admin(organization_id)
  and (role <> 'owner' or private.is_org_owner(organization_id))
);

create or replace function public.update_organization_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role public.organization_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role public.organization_role;
  v_target_role public.organization_role;
begin
  if auth.uid() is null or p_user_id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;

  select role into v_actor_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = auth.uid();
  if v_actor_role is null or v_actor_role not in ('owner', 'admin') then
    raise exception 'Access denied';
  end if;

  select role into v_target_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Member not found';
  end if;

  if v_actor_role <> 'owner' and (v_target_role = 'owner' or p_role = 'owner') then
    raise exception 'Only an owner can change owner access';
  end if;

  update public.organization_members
  set role = p_role
  where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;

create or replace function public.remove_organization_member(
  p_organization_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_role public.organization_role;
  v_target_role public.organization_role;
begin
  if auth.uid() is null or p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;

  select role into v_actor_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = auth.uid();
  if v_actor_role is null or v_actor_role not in ('owner', 'admin') then
    raise exception 'Access denied';
  end if;

  select role into v_target_role
  from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Member not found';
  end if;
  if v_actor_role <> 'owner' and v_target_role = 'owner' then
    raise exception 'Only an owner can remove an owner';
  end if;

  delete from public.organization_members
  where organization_id = p_organization_id and user_id = p_user_id;
end;
$$;

revoke all on function public.update_organization_member_role(uuid, uuid, public.organization_role) from public;
revoke all on function public.remove_organization_member(uuid, uuid) from public;
grant execute on function public.update_organization_member_role(uuid, uuid, public.organization_role) to authenticated;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;

-- Users may queue an outbound WhatsApp message only through a transaction that
-- applies organization membership, opt-out and the 24-hour service window.
create or replace function public.queue_whatsapp_outbound_message(
  p_organization_id uuid,
  p_conversation_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_message_id uuid;
  v_conversation public.conversations%rowtype;
  v_last_inbound_at timestamptz;
begin
  if not private.can_write_org(p_organization_id) then
    raise exception 'Access denied';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4096 then
    raise exception 'Invalid message body';
  end if;

  select * into v_conversation
  from public.conversations
  where id = p_conversation_id and organization_id = p_organization_id
  for update;
  if not found or v_conversation.opt_out_at is not null then
    raise exception 'Conversation cannot receive messages';
  end if;

  select max(coalesce(sent_at, created_at)) into v_last_inbound_at
  from public.messages
  where organization_id = p_organization_id
    and conversation_id = p_conversation_id
    and direction = 'inbound';
  if v_last_inbound_at is null or v_last_inbound_at < now() - interval '24 hours' then
    raise exception 'WhatsApp service window has ended';
  end if;

  insert into public.messages (
    organization_id, conversation_id, direction, status, message_type, body, metadata
  ) values (
    p_organization_id, p_conversation_id, 'outbound', 'queued', 'text', trim(p_body), '{}'::jsonb
  ) returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.queue_whatsapp_outbound_message(uuid, uuid, text) from public;
grant execute on function public.queue_whatsapp_outbound_message(uuid, uuid, text) to authenticated;

comment on function public.update_organization_member_role(uuid, uuid, public.organization_role) is
  'Transactional membership role boundary. Admins cannot alter owner access or their own role.';
comment on function public.queue_whatsapp_outbound_message(uuid, uuid, text) is
  'Queues a WhatsApp message after RLS-equivalent membership, opt-out and 24-hour window checks.';

commit;
