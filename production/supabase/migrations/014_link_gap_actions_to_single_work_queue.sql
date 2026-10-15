alter table public.actions add column if not exists client_request_id uuid;

alter table public.work_items
  add column if not exists gap_id uuid references public.gaps(id) on delete set null,
  add column if not exists action_id uuid references public.actions(id) on delete set null;

create unique index if not exists actions_client_request_uidx
  on public.actions(organization_id,client_request_id)
  where client_request_id is not null;

create unique index if not exists actions_exact_once_uidx
  on public.actions(
    organization_id,
    coalesce(gap_id,'00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(action_text)),
    coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(due_at,'9999-12-31'::date)
  );

create unique index if not exists work_items_action_once_uidx on public.work_items(action_id) where action_id is not null;
create index if not exists work_items_gap_idx on public.work_items(gap_id) where gap_id is not null;
create index if not exists work_items_action_idx on public.work_items(action_id) where action_id is not null;
create index if not exists work_items_assigned_by_idx on public.work_items(assigned_by);
create index if not exists work_items_parent_idx on public.work_items(parent_work_item_id) where parent_work_item_id is not null;
create index if not exists work_items_source_message_idx on public.work_items(source_message_id) where source_message_id is not null;
create index if not exists work_items_source_document_assignment_idx on public.work_items(source_document_assignment_id) where source_document_assignment_id is not null;
create index if not exists project_team_members_user_idx on public.project_team_members(user_id);
create index if not exists project_team_members_assigned_by_idx on public.project_team_members(assigned_by) where assigned_by is not null;
create index if not exists contract_team_members_user_idx on public.contract_team_members(user_id);
create index if not exists contract_team_members_assigned_by_idx on public.contract_team_members(assigned_by) where assigned_by is not null;
create index if not exists work_item_events_org_idx on public.work_item_events(organization_id);
create index if not exists work_item_events_actor_idx on public.work_item_events(actor_user_id) where actor_user_id is not null;
create index if not exists work_item_events_from_idx on public.work_item_events(from_user_id) where from_user_id is not null;
create index if not exists work_item_events_to_idx on public.work_item_events(to_user_id) where to_user_id is not null;
create index if not exists messages_project_idx on public.messages(project_id) where project_id is not null;
create index if not exists messages_contract_idx on public.messages(contract_id) where contract_id is not null;
create index if not exists messages_document_idx on public.messages(document_id) where document_id is not null;
create index if not exists messages_work_item_idx on public.messages(work_item_id) where work_item_id is not null;

create or replace function public.create_gap_action_with_work(
  p_gap_id uuid,
  p_action_text text,
  p_owner_user_id uuid,
  p_due_at date,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_gap public.gaps%rowtype;
  v_action_id uuid;
  v_work_id uuid;
  v_owner_label text;
  v_priority text;
begin
  if v_user is null then raise exception 'Sign in is required.'; end if;
  if p_request_id is null then raise exception 'Request id is required.'; end if;
  if btrim(coalesce(p_action_text,''))='' then raise exception 'Action text is required.'; end if;

  select * into v_gap from public.gaps where id=p_gap_id;
  if not found then raise exception 'Gap not found or not accessible.'; end if;

  if p_owner_user_id is not null then
    select coalesce(display_name,email,'Team member') into v_owner_label
    from public.organization_members
    where organization_id=v_gap.organization_id and user_id=p_owner_user_id;
    if not found then raise exception 'Owner is not a member of this organization.'; end if;
  end if;

  insert into public.actions(
    organization_id,gap_id,action_text,owner_user_id,owner_label,due_at,status,client_request_id
  ) values(
    v_gap.organization_id,v_gap.id,btrim(p_action_text),p_owner_user_id,v_owner_label,p_due_at,'Open',p_request_id
  )
  on conflict do nothing
  returning id into v_action_id;

  if v_action_id is null then
    select id into v_action_id
    from public.actions
    where organization_id=v_gap.organization_id and client_request_id=p_request_id
    limit 1;
  end if;

  if v_action_id is null then
    select id into v_action_id
    from public.actions
    where organization_id=v_gap.organization_id
      and gap_id=v_gap.id
      and lower(btrim(action_text))=lower(btrim(p_action_text))
      and coalesce(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid)=coalesce(p_owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid)
      and coalesce(due_at,'9999-12-31'::date)=coalesce(p_due_at,'9999-12-31'::date)
    order by created_at
    limit 1;
  end if;

  v_priority:=case v_gap.severity when 'Critical' then 'Urgent' when 'High' then 'High' else 'Normal' end;

  if p_owner_user_id is not null then
    insert into public.work_items(
      organization_id,project_id,contract_id,gap_id,action_id,
      title,details,priority,assigned_to,assigned_by,due_at,status,client_request_id
    ) values(
      v_gap.organization_id,v_gap.project_id,v_gap.contract_id,v_gap.id,v_action_id,
      'Gap action · '||left(btrim(p_action_text),180),
      'Execute the approved Gap action. Source Gap: '||v_gap.gap,
      v_priority,p_owner_user_id,v_user,
      case when p_due_at is null then null else p_due_at::timestamptz + interval '1 day' - interval '1 second' end,
      'Assigned',p_request_id
    )
    on conflict do nothing
    returning id into v_work_id;

    if v_work_id is null then
      select id into v_work_id from public.work_items where action_id=v_action_id limit 1;
    end if;
  end if;

  if v_gap.status='Confirmed' then update public.gaps set status='Action Required' where id=v_gap.id; end if;
  return jsonb_build_object('action_id',v_action_id,'work_item_id',v_work_id);
end
$$;

revoke all on function public.create_gap_action_with_work(uuid,text,uuid,date,uuid) from public;
grant execute on function public.create_gap_action_with_work(uuid,text,uuid,date,uuid) to authenticated;