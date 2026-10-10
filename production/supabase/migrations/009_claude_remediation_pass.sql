-- Claude remediation pass: invitation integrity and failed-processing notification.
update public.team_invitations i
set status='Revoked'
where i.status='Pending'
  and exists (
    select 1 from public.organization_members m
    where m.organization_id=i.organization_id
      and lower(coalesce(m.email,''))=lower(i.email)
  );

with ranked as (
  select id,row_number() over (
    partition by organization_id,lower(email)
    order by created_at desc,id desc
  ) rn
  from public.team_invitations
  where status='Pending'
)
update public.team_invitations i
set status='Revoked'
from ranked r
where i.id=r.id and r.rn>1;

create unique index if not exists team_invitations_one_pending_email_idx
on public.team_invitations(organization_id,lower(email))
where status='Pending';

create or replace function private.guard_team_invitation()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  new.email:=lower(trim(new.email));
  if exists(
    select 1 from public.organization_members m
    where m.organization_id=new.organization_id
      and lower(coalesce(m.email,''))=new.email
  ) then
    raise exception 'This person is already a member of the organization.';
  end if;
  if exists(
    select 1 from public.team_invitations i
    where i.organization_id=new.organization_id
      and lower(i.email)=new.email
      and i.status='Pending'
      and i.id is distinct from new.id
  ) then
    raise exception 'A pending invitation already exists for this email.';
  end if;
  return new;
end
$$;
revoke all on function private.guard_team_invitation() from public;
drop trigger if exists team_invitation_guard on public.team_invitations;
create trigger team_invitation_guard before insert or update of email,status
on public.team_invitations for each row execute function private.guard_team_invitation();

create or replace function private.notify_document_processing_failure()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_file_name text;
begin
  if new.processing_status='failed' and old.processing_status is distinct from new.processing_status then
    select d.file_name into v_file_name from public.documents d where d.id=new.document_id;
    if new.created_by is not null then
      insert into public.notifications(organization_id,user_id,kind,title,body,href)
      values(new.organization_id,new.created_by,'document_processing_failed',
             'Document processing needs attention',
             coalesce(v_file_name,'Document')||' could not be processed. Review the status and retry when the AI service is available.',
             '/documents');
    end if;
  end if;
  return new;
end
$$;
revoke all on function private.notify_document_processing_failure() from public;
drop trigger if exists document_processing_failure_notification on public.document_versions;
create trigger document_processing_failure_notification
after update of processing_status on public.document_versions
for each row execute function private.notify_document_processing_failure();

update public.document_versions
set processing_error='AI service temporarily unavailable. Retry when the AI provider is restored.'
where processing_error ilike '%no credits remaining%'
   or processing_error ilike '%insufficient_quota%'
   or processing_error ilike '%platform.openai.com/settings/organization/billing%';
