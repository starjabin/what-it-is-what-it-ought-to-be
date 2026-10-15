create or replace function private.validate_team_scope()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if tg_table_name='project_team_members' then
    if not exists(select 1 from public.projects p where p.id=new.project_id and p.organization_id=new.organization_id) then raise exception 'Project does not belong to this organization.'; end if;
  elsif tg_table_name='contract_team_members' then
    if not exists(select 1 from public.contracts c where c.id=new.contract_id and c.organization_id=new.organization_id) then raise exception 'Contract does not belong to this organization.'; end if;
  end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=new.organization_id and m.user_id=new.user_id) then raise exception 'User is not a member of this organization.'; end if;
  return new;
end
$$;
revoke all on function private.validate_team_scope() from public;

drop trigger if exists project_team_scope_guard on public.project_team_members;
create trigger project_team_scope_guard before insert or update on public.project_team_members for each row execute function private.validate_team_scope();
drop trigger if exists contract_team_scope_guard on public.contract_team_members;
create trigger contract_team_scope_guard before insert or update on public.contract_team_members for each row execute function private.validate_team_scope();

create or replace function private.validate_work_item_scope()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.project_id is not null and not exists(select 1 from public.projects p where p.id=new.project_id and p.organization_id=new.organization_id) then raise exception 'Project does not belong to this organization.'; end if;
  if new.contract_id is not null and not exists(select 1 from public.contracts c where c.id=new.contract_id and c.organization_id=new.organization_id and (new.project_id is null or c.project_id=new.project_id)) then raise exception 'Contract does not belong to the selected organization/project.'; end if;
  if new.document_id is not null and not exists(select 1 from public.documents d where d.id=new.document_id and d.organization_id=new.organization_id and (new.project_id is null or d.project_id=new.project_id) and (new.contract_id is null or d.contract_id=new.contract_id)) then raise exception 'Document does not belong to the selected organization/project/contract.'; end if;
  if new.assigned_to is not null and not exists(select 1 from public.organization_members m where m.organization_id=new.organization_id and m.user_id=new.assigned_to) then raise exception 'Assignee is not a member of this organization.'; end if;
  if new.parent_work_item_id is not null and not exists(select 1 from public.work_items w where w.id=new.parent_work_item_id and w.organization_id=new.organization_id) then raise exception 'Parent work item does not belong to this organization.'; end if;
  return new;
end
$$;
revoke all on function private.validate_work_item_scope() from public;
drop trigger if exists work_item_scope_guard on public.work_items;
create trigger work_item_scope_guard before insert or update on public.work_items for each row execute function private.validate_work_item_scope();

create or replace function private.validate_message_context()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.project_id is not null and not exists(select 1 from public.projects p where p.id=new.project_id and p.organization_id=new.organization_id) then raise exception 'Message project does not belong to this organization.'; end if;
  if new.contract_id is not null and not exists(select 1 from public.contracts c where c.id=new.contract_id and c.organization_id=new.organization_id and (new.project_id is null or c.project_id=new.project_id)) then raise exception 'Message contract does not belong to the selected organization/project.'; end if;
  if new.document_id is not null and not exists(select 1 from public.documents d where d.id=new.document_id and d.organization_id=new.organization_id and (new.project_id is null or d.project_id=new.project_id) and (new.contract_id is null or d.contract_id=new.contract_id)) then raise exception 'Message document does not belong to the selected context.'; end if;
  if new.recipient_user_id is not null and not exists(select 1 from public.organization_members m where m.organization_id=new.organization_id and m.user_id=new.recipient_user_id) then raise exception 'Message recipient is not a member of this organization.'; end if;
  if new.work_item_id is not null and not exists(select 1 from public.work_items w where w.id=new.work_item_id and w.organization_id=new.organization_id) then raise exception 'Message work item does not belong to this organization.'; end if;
  return new;
end
$$;
revoke all on function private.validate_message_context() from public;
drop trigger if exists message_context_guard on public.messages;
create trigger message_context_guard before insert or update on public.messages for each row execute function private.validate_message_context();

create or replace function private.notify_direct_message()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.recipient_user_id is not null and new.recipient_user_id<>new.sender_user_id then
    insert into public.notifications(organization_id,user_id,kind,title,body,href)
    values(new.organization_id,new.recipient_user_id,
      case when new.message_type in ('Work Request','Forward','Reminder') then 'work_message' else 'direct_message' end,
      case when new.message_type='Work Request' then 'New work request' when new.message_type='Forward' then 'Work forwarded' when new.message_type='Reminder' then 'Work reminder' else 'New message' end,
      left(new.body,240),'/communication');
  end if;
  return new;
end
$$;
revoke all on function private.notify_direct_message() from public;
drop trigger if exists message_direct_notification on public.messages;
create trigger message_direct_notification after insert on public.messages for each row execute function private.notify_direct_message();