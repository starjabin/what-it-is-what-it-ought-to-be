-- Dedicated staging candidate only. Service automation may propose, not approve.
create or replace function private.sf01_guard_service_gap() returns trigger
language plpgsql set search_path='' as $$
begin
 if current_user='service_role' or coalesce(auth.jwt()->>'role','')='service_role' then
   if tg_op<>'INSERT' then
     raise exception 'SF01-SERVICE: existing findings require authenticated human workflow';
   end if;
   if new.status not in ('Detected','Under Review') or new.reviewed_by is not null or new.reviewed_at is not null or new.created_by is null or new.source_kind is distinct from 'ai' then
     raise exception 'SF01-SERVICE: only attributed unreviewed AI candidates permitted';
   end if;
   if not exists(select 1 from public.projects p join public.organization_members m on m.organization_id=p.organization_id where p.id=new.project_id and p.organization_id=new.organization_id and m.user_id=new.created_by) then
     raise exception 'SF01-SERVICE: candidate actor must belong to candidate tenant';
   end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function private.sf01_guard_service_gap() from public,anon,authenticated,service_role;
create trigger aa_sf01_service_gap before insert or update or delete on public.gaps
for each row execute function private.sf01_guard_service_gap();
