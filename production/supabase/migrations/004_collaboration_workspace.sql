alter table public.organization_members
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists job_title text;

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'contributor',
  job_title text,
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id),
  status text not null default 'Pending' check (status in ('Pending','Accepted','Revoked','Expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(organization_id,project_id,name)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table public.document_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  assignee_user_id uuid references auth.users(id),
  assignee_label text,
  instruction text not null,
  priority text not null default 'Normal' check (priority in ('Low','Normal','High','Urgent')),
  due_at date,
  status text not null default 'Assigned' check (status in ('Assigned','In Review','Action Required','Completed','Closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index team_invitations_org_idx on public.team_invitations(organization_id,status,created_at desc);
create index team_invitations_email_idx on public.team_invitations(lower(email));
create index channels_org_idx on public.channels(organization_id,project_id);
create index messages_channel_created_idx on public.messages(channel_id,created_at desc);
create index messages_org_idx on public.messages(organization_id,created_at desc);
create index document_assignments_org_idx on public.document_assignments(organization_id,status,due_at);
create index document_assignments_doc_idx on public.document_assignments(document_id);
create index document_assignments_assignee_idx on public.document_assignments(assignee_user_id) where assignee_user_id is not null;

create or replace function private.can_manage_team(org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid() and m.role in ('owner','admin'))$$;
revoke all on function private.can_manage_team(uuid) from public;
grant execute on function private.can_manage_team(uuid) to authenticated;

alter table public.team_invitations enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.document_assignments enable row level security;

create policy team_invitations_select on public.team_invitations for select to authenticated using (private.is_org_member(organization_id));
create policy team_invitations_invitee_select on public.team_invitations for select to authenticated using (lower(email)=lower(coalesce(auth.jwt()->>'email','')) and status='Pending' and expires_at>now());
create policy team_invitations_insert on public.team_invitations for insert to authenticated with check (private.can_manage_team(organization_id) and invited_by=(select auth.uid()));
create policy team_invitations_update on public.team_invitations for update to authenticated using (private.can_manage_team(organization_id)) with check (private.can_manage_team(organization_id));
create policy team_invitations_delete on public.team_invitations for delete to authenticated using (private.can_manage_team(organization_id));

create policy channels_select on public.channels for select to authenticated using (private.is_org_member(organization_id));
create policy channels_insert on public.channels for insert to authenticated with check (private.is_org_member(organization_id) and (created_by is null or created_by=(select auth.uid())));
create policy channels_update on public.channels for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy channels_delete on public.channels for delete to authenticated using (private.is_org_member(organization_id));

create policy messages_select on public.messages for select to authenticated using (private.is_org_member(organization_id));
create policy messages_insert on public.messages for insert to authenticated with check (private.is_org_member(organization_id) and sender_user_id=(select auth.uid()));
create policy messages_update on public.messages for update to authenticated using (private.is_org_member(organization_id) and sender_user_id=(select auth.uid())) with check (private.is_org_member(organization_id) and sender_user_id=(select auth.uid()));

create policy document_assignments_select on public.document_assignments for select to authenticated using (private.is_org_member(organization_id));
create policy document_assignments_insert on public.document_assignments for insert to authenticated with check (private.is_org_member(organization_id) and created_by=(select auth.uid()));
create policy document_assignments_update on public.document_assignments for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy document_assignments_delete on public.document_assignments for delete to authenticated using (private.is_org_member(organization_id));

create policy member_invited_self_insert on public.organization_members for insert to authenticated
with check (
  user_id=(select auth.uid())
  and exists(select 1 from public.team_invitations i where i.organization_id=organization_members.organization_id and lower(i.email)=lower(coalesce(auth.jwt()->>'email','')) and i.status='Pending' and i.expires_at>now())
);
create policy member_self_update on public.organization_members for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and private.is_org_member(organization_id));

grant select,insert,update,delete on public.team_invitations to authenticated;
grant select,insert,update,delete on public.channels to authenticated;
grant select,insert,update on public.messages to authenticated;
grant select,insert,update,delete on public.document_assignments to authenticated;
grant insert,update on public.organization_members to authenticated;

create or replace function private.mark_invitation_accepted()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  update public.team_invitations set status='Accepted',accepted_at=now()
  where organization_id=new.organization_id and lower(email)=lower(coalesce(new.email,auth.jwt()->>'email','')) and status='Pending';
  return new;
end
$$;
revoke all on function private.mark_invitation_accepted() from public;
create trigger organization_members_accept_invite after insert on public.organization_members for each row execute function private.mark_invitation_accepted();

create or replace function public.accept_team_invitation(p_token uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_inv public.team_invitations%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into v_inv from public.team_invitations where token=p_token and lower(email)=v_email and status='Pending' and expires_at>now();
  if not found then raise exception 'invitation not found, expired, or email mismatch'; end if;
  insert into public.organization_members(organization_id,user_id,role,display_name,email,job_title)
  values(v_inv.organization_id,v_user_id,v_inv.role,coalesce(auth.jwt()->'user_metadata'->>'full_name',split_part(v_inv.email,'@',1)),v_inv.email,v_inv.job_title)
  on conflict (organization_id,user_id) do nothing;
  return jsonb_build_object('organization_id',v_inv.organization_id,'accepted',true);
end
$$;
revoke all on function public.accept_team_invitation(uuid) from public;
revoke all on function public.accept_team_invitation(uuid) from anon;
grant execute on function public.accept_team_invitation(uuid) to authenticated;

create or replace function public.bootstrap_workspace_v2(
  p_display_name text,p_job_title text,p_organization_name text,p_market text,p_currency text,p_project_name text,p_project_code text
)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_existing_org uuid;
  v_existing_project uuid;
  v_org_id uuid := gen_random_uuid();
  v_project_id uuid := gen_random_uuid();
  v_channel_id uuid := gen_random_uuid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if length(trim(coalesce(p_display_name,'')))<2 then raise exception 'name is required'; end if;
  if length(trim(coalesce(p_organization_name,'')))<2 then raise exception 'organization name is required'; end if;
  if length(trim(coalesce(p_project_name,'')))<2 then raise exception 'project name is required'; end if;
  if length(trim(coalesce(p_project_code,'')))<1 then raise exception 'project code is required'; end if;
  if p_currency not in ('USD','SAR','AED','GBP','EUR') then raise exception 'unsupported currency'; end if;

  select m.organization_id into v_existing_org from public.organization_members m where m.user_id=v_user_id order by m.created_at limit 1;
  if v_existing_org is not null then
    update public.organization_members set display_name=trim(p_display_name),email=v_email,job_title=nullif(trim(coalesce(p_job_title,'')),'')
    where organization_id=v_existing_org and user_id=v_user_id;
    select p.id into v_existing_project from public.projects p where p.organization_id=v_existing_org order by p.created_at limit 1;
    return jsonb_build_object('organization_id',v_existing_org,'project_id',v_existing_project,'already_exists',true);
  end if;

  insert into public.organizations(id,name,market,currency,created_by)
  values(v_org_id,trim(p_organization_name),coalesce(nullif(trim(p_market),''),'Global / International'),p_currency,v_user_id);

  update public.organization_members set display_name=trim(p_display_name),email=v_email,job_title=nullif(trim(coalesce(p_job_title,'')),'')
  where organization_id=v_org_id and user_id=v_user_id;

  insert into public.projects(id,organization_id,code,name,market,status)
  values(v_project_id,v_org_id,trim(p_project_code),trim(p_project_name),coalesce(nullif(trim(p_market),''),'Global / International'),'Execution');

  insert into public.channels(id,organization_id,project_id,name,description,created_by)
  values(v_channel_id,v_org_id,null,'General','Organization-wide commercial and contract coordination.',v_user_id);

  return jsonb_build_object('organization_id',v_org_id,'project_id',v_project_id,'channel_id',v_channel_id,'already_exists',false);
end
$$;
revoke all on function public.bootstrap_workspace_v2(text,text,text,text,text,text,text) from public;
revoke all on function public.bootstrap_workspace_v2(text,text,text,text,text,text,text) from anon;
grant execute on function public.bootstrap_workspace_v2(text,text,text,text,text,text,text) to authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
