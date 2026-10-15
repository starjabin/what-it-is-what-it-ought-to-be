-- Canonical records and idempotent writes.
-- One business object is created once; later activity references the canonical record.

-- Merge duplicate contracts that share the same organization, project, and normalized reference.
create temporary table _contract_merge(old_id uuid primary key, keep_id uuid not null) on commit drop;

insert into _contract_merge(old_id,keep_id)
select id,keep_id
from (
  select id,
         first_value(id) over (
           partition by organization_id,project_id,lower(btrim(contract_number))
           order by created_at,id
         ) keep_id,
         row_number() over (
           partition by organization_id,project_id,lower(btrim(contract_number))
           order by created_at,id
         ) rn
  from public.contracts
  where contract_number is not null and btrim(contract_number)<>''
) x
where rn>1;

insert into public.contract_team_members(organization_id,contract_id,user_id,team_role,assigned_by,created_at)
select ctm.organization_id,m.keep_id,ctm.user_id,ctm.team_role,ctm.assigned_by,ctm.created_at
from public.contract_team_members ctm
join _contract_merge m on m.old_id=ctm.contract_id
on conflict(contract_id,user_id) do update set team_role=excluded.team_role;

delete from public.contract_team_members ctm using _contract_merge m where ctm.contract_id=m.old_id;
update public.documents d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.clauses d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.definitions d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.obligations d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.evidence d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.gaps d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.report_snapshots d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.work_items d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
update public.messages d set contract_id=m.keep_id from _contract_merge m where d.contract_id=m.old_id;
delete from public.contracts c using _contract_merge m where c.id=m.old_id;

-- Remove exact duplicate legacy document assignments, keeping the first save.
with ranked as (
  select id,
    row_number() over (
      partition by organization_id,document_id,
        coalesce(assignee_user_id,'00000000-0000-0000-0000-000000000000'::uuid),
        lower(btrim(instruction)),priority,coalesce(due_at,'9999-12-31'::date),status
      order by created_at,id
    ) rn
  from public.document_assignments
)
delete from public.document_assignments a
using ranked r
where a.id=r.id and r.rn>1;

alter table public.work_items
  add column if not exists source_document_assignment_id uuid references public.document_assignments(id) on delete set null,
  add column if not exists client_request_id uuid;

alter table public.messages add column if not exists client_request_id uuid;
alter table public.projects add column if not exists client_request_id uuid;
alter table public.contracts add column if not exists client_request_id uuid;

-- Migrate the legacy document-action register into the single canonical work queue without re-notifying users.
alter table public.work_items disable trigger work_item_activity_insert;

insert into public.work_items(
  organization_id,project_id,contract_id,document_id,source_document_assignment_id,
  title,details,priority,assigned_to,assigned_by,due_at,status,completed_at,created_at,updated_at
)
select
  a.organization_id,d.project_id,d.contract_id,a.document_id,a.id,
  'Document action · '||d.file_name,
  a.instruction,
  case when a.priority in ('Low','Normal','High','Urgent') then a.priority else 'Normal' end,
  a.assignee_user_id,
  a.created_by,
  case when a.due_at is null then null else a.due_at::timestamptz + interval '1 day' - interval '1 second' end,
  case
    when a.status='In Review' then 'In Progress'
    when a.status in ('Assigned','Action Required','Completed','Closed') then a.status
    else 'Assigned'
  end,
  a.completed_at,
  a.created_at,
  coalesce(a.completed_at,a.created_at)
from public.document_assignments a
join public.documents d on d.id=a.document_id
where not exists(select 1 from public.work_items w where w.source_document_assignment_id=a.id);

insert into public.work_item_events(organization_id,work_item_id,actor_user_id,event_type,to_user_id,note,created_at)
select w.organization_id,w.id,w.assigned_by,'Created',w.assigned_to,'Migrated from the legacy document action register.',w.created_at
from public.work_items w
where w.source_document_assignment_id is not null
  and not exists(select 1 from public.work_item_events e where e.work_item_id=w.id and e.event_type='Created');

alter table public.work_items enable trigger work_item_activity_insert;

create unique index if not exists projects_org_code_normalized_uidx
  on public.projects(organization_id,lower(btrim(code)));

create unique index if not exists contracts_org_project_reference_normalized_uidx
  on public.contracts(organization_id,project_id,lower(btrim(contract_number)))
  where contract_number is not null and btrim(contract_number)<>'';

create unique index if not exists documents_org_content_hash_uidx
  on public.documents(organization_id,content_hash)
  where content_hash is not null and btrim(content_hash)<>'';

create unique index if not exists document_versions_org_content_hash_uidx
  on public.document_versions(organization_id,content_hash)
  where content_hash is not null and btrim(content_hash)<>'';

create unique index if not exists document_assignments_exact_once_uidx
  on public.document_assignments(
    organization_id,document_id,
    coalesce(assignee_user_id,'00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(instruction)),priority,coalesce(due_at,'9999-12-31'::date),status
  );

create unique index if not exists work_items_source_document_assignment_uidx
  on public.work_items(source_document_assignment_id)
  where source_document_assignment_id is not null;

create unique index if not exists work_items_client_request_uidx
  on public.work_items(organization_id,client_request_id)
  where client_request_id is not null;

create unique index if not exists messages_client_request_uidx
  on public.messages(organization_id,client_request_id)
  where client_request_id is not null;

create unique index if not exists projects_client_request_uidx
  on public.projects(organization_id,client_request_id)
  where client_request_id is not null;

create unique index if not exists contracts_client_request_uidx
  on public.contracts(organization_id,client_request_id)
  where client_request_id is not null;

create or replace function private.normalize_master_record()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_table_name='projects' then
    new.code:=btrim(new.code);
    new.name:=btrim(new.name);
  elsif tg_table_name='contracts' then
    new.contract_number:=nullif(btrim(coalesce(new.contract_number,'')),'');
    new.title:=btrim(new.title);
  end if;
  return new;
end
$$;
revoke all on function private.normalize_master_record() from public;

drop trigger if exists projects_normalize_master on public.projects;
create trigger projects_normalize_master
before insert or update of code,name on public.projects
for each row execute function private.normalize_master_record();

drop trigger if exists contracts_normalize_master on public.contracts;
create trigger contracts_normalize_master
before insert or update of contract_number,title on public.contracts
for each row execute function private.normalize_master_record();