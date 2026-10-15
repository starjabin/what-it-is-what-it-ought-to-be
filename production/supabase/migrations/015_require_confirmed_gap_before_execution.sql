create or replace function private.guard_gap_action_creation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_status public.gap_status;
begin
  if new.gap_id is null then return new; end if;

  select g.status into v_status
  from public.gaps g
  where g.id=new.gap_id and g.organization_id=new.organization_id;

  if v_status is null then raise exception 'Gap does not belong to this organization.'; end if;

  if v_status not in ('Confirmed','Action Required','In Progress') then
    raise exception 'Confirm the Gap before creating accountable execution work.';
  end if;

  return new;
end
$$;
revoke all on function private.guard_gap_action_creation() from public;

drop trigger if exists actions_require_confirmed_gap on public.actions;
create trigger actions_require_confirmed_gap
before insert on public.actions
for each row execute function private.guard_gap_action_creation();