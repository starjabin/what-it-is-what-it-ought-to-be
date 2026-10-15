drop trigger if exists work_item_activity_insert on public.work_items;
drop trigger if exists work_item_activity_update on public.work_items;
drop function if exists private.work_item_activity();

create or replace function private.touch_work_item()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  new.updated_at:=now();
  if old.assigned_to is distinct from new.assigned_to then new.forwarded_at:=now(); end if;
  if old.status is distinct from new.status then
    if new.status='Accepted' and new.accepted_at is null then new.accepted_at:=now(); end if;
    if new.status in ('Completed','Closed') and new.completed_at is null then new.completed_at:=now(); end if;
  end if;
  return new;
end
$$;
revoke all on function private.touch_work_item() from public;

create trigger work_item_touch_update before update on public.work_items for each row execute function private.touch_work_item();

create or replace function private.log_work_item_activity()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    insert into public.work_item_events(organization_id,work_item_id,actor_user_id,event_type,to_user_id,note)
    values(new.organization_id,new.id,new.assigned_by,'Created',new.assigned_to,new.details);
    if new.assigned_to is not null then
      insert into public.notifications(organization_id,user_id,kind,title,body,href)
      values(new.organization_id,new.assigned_to,'work_assigned','New work assigned',
        new.title||case when new.due_at is not null then ' · due '||to_char(new.due_at,'YYYY-MM-DD HH24:MI TZ') else '' end,
        '/communication?work='||new.id);
    end if;
    return new;
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    insert into public.work_item_events(organization_id,work_item_id,actor_user_id,event_type,from_user_id,to_user_id,note)
    values(new.organization_id,new.id,(select auth.uid()),'Forwarded',old.assigned_to,new.assigned_to,'Work reassigned or forwarded.');
    if new.assigned_to is not null then
      insert into public.notifications(organization_id,user_id,kind,title,body,href)
      values(new.organization_id,new.assigned_to,'work_forwarded','Work forwarded to you',
        new.title||case when new.due_at is not null then ' · due '||to_char(new.due_at,'YYYY-MM-DD HH24:MI TZ') else '' end,
        '/communication?work='||new.id);
    end if;
  end if;

  if old.status is distinct from new.status then
    insert into public.work_item_events(organization_id,work_item_id,actor_user_id,event_type,note)
    values(new.organization_id,new.id,(select auth.uid()),
      case when new.status='Completed' then 'Completed' when new.status='Accepted' then 'Accepted' else 'Status Changed' end,
      old.status||' → '||new.status);
  end if;
  return new;
end
$$;
revoke all on function private.log_work_item_activity() from public;

create trigger work_item_activity_insert after insert on public.work_items for each row execute function private.log_work_item_activity();
create trigger work_item_activity_update after update on public.work_items for each row execute function private.log_work_item_activity();