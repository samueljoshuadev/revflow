-- Atomic, explainable AI qualification with a deliberately limited Kanban move.
-- The AI never chooses arbitrary stage IDs and can never close or lose a deal.

begin;

create or replace function public.apply_lead_ai_analysis_and_advance(
  p_organization_id uuid,
  p_lead_id uuid,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_result jsonb,
  p_target_stage_id uuid,
  p_automation_reason text,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_analysis_id uuid;
  v_score integer;
  v_priority text;
  v_vertical public.organization_vertical;
  v_lead public.leads%rowtype;
  v_from_stage public.pipeline_stages%rowtype;
  v_to_stage public.pipeline_stages%rowtype;
  v_stage_advanced boolean := false;
begin
  if not private.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select * into v_lead
  from public.leads
  where id = p_lead_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'lead_not_found'; end if;

  select vertical into v_vertical
  from public.organizations
  where id = p_organization_id;

  select * into v_from_stage
  from public.pipeline_stages
  where id = v_lead.stage_id
    and organization_id = p_organization_id
    and pipeline_id = v_lead.pipeline_id;
  if not found then raise exception 'current_stage_not_found'; end if;

  v_score := (p_result ->> 'score')::integer;
  v_priority := p_result ->> 'priority';
  if v_score not between 0 and 100
    or v_priority not in ('low', 'medium', 'high', 'urgent')
    or nullif(trim(p_result ->> 'summary'), '') is null
    or nullif(trim(p_result ->> 'next_action'), '') is null then
    raise exception 'invalid_ai_result';
  end if;

  if p_target_stage_id is not null then
    select * into v_to_stage
    from public.pipeline_stages
    where id = p_target_stage_id
      and organization_id = p_organization_id
      and pipeline_id = v_lead.pipeline_id;
    if not found then raise exception 'invalid_automation_target'; end if;

    if v_score < 60
      or v_from_stage.is_closed
      or v_to_stage.is_closed
      or v_to_stage.position <= v_from_stage.position then
      raise exception 'unsafe_automation_target';
    end if;

    if v_vertical = 'agency' then
      if v_from_stage.slug not in ('novo-lead', 'clicou-no-link', 'cadastro-concluido')
        or v_to_stage.slug <> 'qualificado' then
        raise exception 'unsafe_agency_automation_target';
      end if;
    elsif v_vertical = 'real_estate' then
      if v_from_stage.slug <> 'novo-lead'
        or v_to_stage.slug <> 'perfil-identificado'
        or not exists (
          select 1
          from public.real_estate_lead_profiles profile
          where profile.organization_id = p_organization_id
            and profile.lead_id = p_lead_id
            and profile.purpose is not null
            and profile.property_type is not null
            and nullif(trim(profile.preferred_city), '') is not null
            and profile.budget_max is not null
        ) then
        raise exception 'unsafe_real_estate_automation_target';
      end if;
    else
      raise exception 'unsupported_organization_vertical';
    end if;

    v_stage_advanced := true;
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
      ai_status = 'analyzed',
      stage_id = case when v_stage_advanced then v_to_stage.id else stage_id end,
      last_interaction_at = case when v_stage_advanced then now() else last_interaction_at end
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
      'priority', v_priority,
      'stage_advanced', v_stage_advanced
    )
  );

  if v_stage_advanced then
    insert into public.lead_events (
      organization_id, lead_id, actor_user_id, event_type, source, metadata
    ) values (
      p_organization_id, p_lead_id, auth.uid(), 'stage_changed', 'ai',
      jsonb_build_object(
        'from_stage_id', v_from_stage.id,
        'from_stage_name', v_from_stage.name,
        'to_stage_id', v_to_stage.id,
        'to_stage_name', v_to_stage.name,
        'automated', true,
        'reason', left(coalesce(p_automation_reason, 'Qualificação validada pela IA.'), 500),
        'analysis_id', v_analysis_id
      )
    );
  end if;

  return jsonb_build_object(
    'analysis_id', v_analysis_id,
    'stage_advanced', v_stage_advanced,
    'from_stage_id', v_from_stage.id,
    'from_stage_name', v_from_stage.name,
    'to_stage_id', case when v_stage_advanced then v_to_stage.id else null end,
    'to_stage_name', case when v_stage_advanced then v_to_stage.name else null end
  );
end;
$$;

revoke all on function public.apply_lead_ai_analysis_and_advance(
  uuid, uuid, text, text, text, jsonb, uuid, text, integer, integer
) from public, anon;
grant execute on function public.apply_lead_ai_analysis_and_advance(
  uuid, uuid, text, text, text, jsonb, uuid, text, integer, integer
) to authenticated;

comment on function public.apply_lead_ai_analysis_and_advance(
  uuid, uuid, text, text, text, jsonb, uuid, text, integer, integer
) is 'Atomically stores a validated OpenAI analysis and permits only the reviewed qualification-stage transitions.';

commit;

