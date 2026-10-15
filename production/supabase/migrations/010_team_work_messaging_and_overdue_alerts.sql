create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.project_team_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_role text not null default 'Project Team',
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);

create table if not exists public.contract_team_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_role text not null default 'Contract Team',
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(contract_id,user_id)
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  source_message_id uuid references public.messages(id) on delete set null,
  parent_work_item_id uuid references public.work_items(id) on delete set null,
  title text not null check (char_length(title) between 2 and 240),
  details text,
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  assigned_to uuid references auth.users(id),
  assigned_by uuid not null references auth.users(id),
  due_at timestamptz,
  status text not null default 'Assigned'
    check (status in ('Assigned','Accepted','In Progress','Waiting','Action Required','Completed','Closed','Cancelled')),
  accepted_at timestamptz,
  completed_at timestamptz,
  forwarded_at timestamptz,
  last_overdue_alert_at timestamptz,
  overdue_alert_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_item_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_item_id uuid not null references public.work_items(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  event_type text not null check (event_type in ('Created','Assigned','Forwarded','Accepted','Status Changed','Commented','Completed','Overdue Alert')),
  note text,
  from_user_id uuid references auth.users(id),
  to_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.messages
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists work_item_id uuid references public.work_items(id) on delete set null,
  add column if not exists recipient_user_id uuid references auth.users(id) on delete set null,
  add column if not exists message_type text not null default 'Message'
    check (message_type in ('Message','Work Request','Forward','Status Update','Decision','Reminder'));

create index if not exists project_team_members_org_idx on public.project_team_members(organization_id,user_id);
create index if not exists contract_team_members_org_idx on public.contract_team_members(organization_id,user_id);
create index if not exists work_items_org_status_due_idx on public.work_items(organization_id,status,due_at);
create index if not exists work_items_assignee_idx on public.work_items(assigned_to,status,due_at) where assigned_to is not null;
create index if not exists work_items_project_idx on public.work_items(project_id,status) where project_id is not null;
create index if not exists work_items_contract_idx on public.work_items(contract_id,status) where contract_id is not null;
create index if not exists work_items_document_idx on public.work_items(document_id) where document_id is not null;
create index if not exists work_item_events_work_idx on public.work_item_events(work_item_id,created_at desc);
create index if not exists messages_context_idx on public.messages(organization_id,project_id,contract_id,document_id,created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_user_id,created_at desc) where recipient_user_id is not null;

create or replace function private.can_coordinate_work(org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','contract_manager'))$$;
revoke all on function private.can_coordinate_work(uuid) from public;
grant execute on function private.can_coordinate_work(uuid) to authenticated;

alter table public.project_team_members enable row level security;
alter table public.contract_team_members enable row level security;
alter table public.work_items enable row level security;
alter table public.work_item_events enable row level security;

create policy project_team_members_select on public.project_team_members for select to authenticated using (private.is_org_member(organization_id));
create policy project_team_members_insert on public.project_team_members for insert to authenticated with check (private.can_coordinate_work(organization_id) and assigned_by=(select auth.uid()));
create policy project_team_members_update on public.project_team_members for update to authenticated using (private.can_coordinate_work(organization_id)) with check (private.can_coordinate_work(organization_id));
create policy project_team_members_delete on public.project_team_members for delete to authenticated using (private.can_coordinate_work(organization_id));

create policy contract_team_members_select on public.contract_team_members for select to authenticated using (private.is_org_member(organization_id));
create policy contract_team_members_insert on public.contract_team_members for insert to authenticated with check (private.can_coordinate_work(organization_id) and assigned_by=(select auth.uid()));
create policy contract_team_members_update on public.contract_team_members for update to authenticated using (private.can_coordinate_work(organization_id)) with check (private.can_coordinate_work(organization_id));
create policy contract_team_members_delete on public.contract_team_members for delete to authenticated using (private.can_coordinate_work(organization_id));

create policy work_items_select on public.work_items for select to authenticated using (private.is_org_member(organization_id));
create policy work_items_insert on public.work_items for insert to authenticated with check (private.is_org_member(organization_id) and assigned_by=(select auth.uid()));
create policy work_items_update on public.work_items for update to authenticated using (
  private.is_org_member(organization_id)
  and (assigned_to=(select auth.uid()) or assigned_by=(select auth.uid()) or private.can_coordinate_work(organization_id))
) with check (private.is_org_member(organization_id));
create policy work_items_delete on public.work_items for delete to authenticated using (assigned_by=(select auth.uid()) or private.can_coordinate_work(organization_id));

create policy work_item_events_select on public.work_item_events for select to authenticated using (private.is_org_member(organization_id));
create policy work_item_events_insert on public.work_item_events for insert to authenticated with check (private.is_org_member(organization_id) and (actor_user_id is null or actor_user_id=(select auth.uid())));

grant select,insert,update,delete on public.project_team_members to authenticated;
grant select,insert,update,delete on public.contract_team_members to authenticated;
grant select,insert,update,delete on public.work_items to authenticated;
grant select,insert on public.work_item_events to authenticated;

create or replace function private.raise_overdue_work_alerts()
returns integer language plpgsql security definer set search_path=''
as $$
declare r record; v_count integer:=0; v_email text;
begin
  for r in
    select w.* from public.work_items w
    where w.due_at is not null and w.due_at<now()
      and w.status not in ('Completed','Closed','Cancelled')
      and w.assigned_to is not null
      and (w.last_overdue_alert_at is null or w.last_overdue_alert_at<now()-interval '24 hours')
  loop
    insert into public.notifications(organization_id,user_id,kind,title,body,href)
    values(r.organization_id,r.assigned_to,'work_overdue','Assigned work is overdue',
      r.title||' · overdue since '||to_char(r.due_at,'YYYY-MM-DD HH24:MI TZ'),
      '/communication?work='||r.id);

    insert into public.work_item_events(organization_id,work_item_id,actor_user_id,event_type,to_user_id,note)
    values(r.organization_id,r.id,null,'Overdue Alert',r.assigned_to,'System overdue alert sent.');

    select lower(m.email) into v_email from public.organization_members m
    where m.organization_id=r.organization_id and m.user_id=r.assigned_to limit 1;

    if v_email is not null then
      insert into public.email_outbox(organization_id,recipient,template,subject,payload,status)
      values(r.organization_id,v_email,'work_overdue','Overdue work: '||r.title,
        jsonb_build_object('work_item_id',r.id,'title',r.title,'due_at',r.due_at,'priority',r.priority,'href','/communication?work='||r.id),'Pending');
    end if;

    update public.work_items set last_overdue_alert_at=now(),overdue_alert_count=overdue_alert_count+1,updated_at=now() where id=r.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end
$$;
revoke all on function private.raise_overdue_work_alerts() from public;

select cron.schedule('contractgap-overdue-work-alerts','*/15 * * * *',$$select private.raise_overdue_work_alerts();$$);

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='work_items') then
    alter publication supabase_realtime add table public.work_items;
  end if;
end
$$;