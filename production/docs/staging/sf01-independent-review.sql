-- SF-01 staging candidate. Apply only to dedicated staging after review.
-- Do not apply to production. Existing RLS and review permission checks remain in force.
create or replace function private.sf01_guard_independent_review() returns trigger
language plpgsql set search_path='' as $$
declare actor uuid := auth.uid();
begin
 if coalesce(auth.jwt()->>'role','') <> 'authenticated' then
   -- Service-role writes are outside this control; existing review guard still applies.
   return new;
 end if;
 if actor is null or coalesce(auth.jwt()->>'aal','') <> 'aal2' then
   raise exception 'SF01: verified AAL2 actor required';
 end if;
 if tg_op='INSERT' then
   if new.created_by is distinct from actor then
     raise exception 'SF01: candidate creator must match authenticated actor';
   end if;
   if new.status not in ('Detected','Under Review') or new.reviewed_by is not null or new.reviewed_at is not null then
     raise exception 'SF01: insert must be an unreviewed candidate';
   end if;
   return new;
 end if;
 if new.created_by is distinct from old.created_by or new.organization_id is distinct from old.organization_id or new.project_id is distinct from old.project_id then
   raise exception 'SF01: candidate creator and scope are immutable';
 end if;
 if new.status is distinct from old.status and new.status in ('Confirmed','Action Required','In Progress','Resolved','Closed') then
   if old.created_by is null or old.created_by=actor then
     raise exception 'SF01: independent reviewer required for material transition';
   end if;
   if not private.can_review_core(new.organization_id) or new.reviewed_by is distinct from actor or new.reviewed_at is null then
     raise exception 'SF01: verified reviewer required';
   end if;
 elsif new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then
   raise exception 'SF01: review attribution cannot be directly edited';
 end if;
 return new;
end $$;
revoke all on function private.sf01_guard_independent_review() from public,anon,authenticated;
-- Run after gaps_review_guard, which derives the reviewer identity from auth.uid().
create trigger zz_sf01_independent_review before insert or update on public.gaps
for each row execute function private.sf01_guard_independent_review();
