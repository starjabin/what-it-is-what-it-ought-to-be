-- Billing, trial entitlements, usage controls and notification outbox.
create table if not exists public.plan_catalog (
  code text primary key,
  name text not null,
  description text,
  monthly_amount_minor integer,
  currency char(3) not null default 'SAR',
  seats_limit integer,
  projects_limit integer,
  ai_runs_monthly_limit integer,
  storage_gb_limit integer,
  features jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
insert into public.plan_catalog(code,name,description,monthly_amount_minor,currency,seats_limit,projects_limit,ai_runs_monthly_limit,storage_gb_limit,features,is_public,sort_order)
values
('trial','14-day Trial','Full evaluation workspace for new organizations.',0,'SAR',5,3,100,5,'{"team":true,"communication":true,"documents":true,"gap_engine":true,"ai_analyst":true,"reports":true}'::jsonb,false,0),
('professional','Professional','For focused contracts and commercial teams.',69900,'SAR',8,10,300,50,'{"team":true,"communication":true,"documents":true,"gap_engine":true,"ai_analyst":true,"reports":true}'::jsonb,true,10),
('business','Business','For multi-project commercial and contract organizations.',199900,'SAR',30,50,1500,500,'{"team":true,"communication":true,"documents":true,"gap_engine":true,"ai_analyst":true,"reports":true,"advanced_permissions":true,"integrations":true}'::jsonb,true,20),
('enterprise','Enterprise','For portfolios requiring SSO, implementation, integrations and commercial support.',null,'SAR',null,null,null,null,'{"team":true,"communication":true,"documents":true,"gap_engine":true,"ai_analyst":true,"reports":true,"advanced_permissions":true,"integrations":true,"sso":true,"priority_support":true}'::jsonb,true,30)
on conflict(code) do update set name=excluded.name,description=excluded.description,monthly_amount_minor=excluded.monthly_amount_minor,currency=excluded.currency,seats_limit=excluded.seats_limit,projects_limit=excluded.projects_limit,ai_runs_monthly_limit=excluded.ai_runs_monthly_limit,storage_gb_limit=excluded.storage_gb_limit,features=excluded.features,is_public=excluded.is_public,sort_order=excluded.sort_order;

create table if not exists public.billing_accounts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'unconfigured',
  provider_customer_id text,
  provider_subscription_id text unique,
  plan_code text not null references public.plan_catalog(code) default 'trial',
  status text not null default 'trialing' check(status in ('trialing','active','past_due','paused','canceled','incomplete')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  recipient text not null,
  template text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Pending' check(status in ('Pending','Sending','Sent','Failed','Suppressed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists billing_accounts_plan_code_idx on public.billing_accounts(plan_code);
create index if not exists billing_events_org_idx on public.billing_events(organization_id,created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id,read_at,created_at desc);
create index if not exists notifications_org_idx on public.notifications(organization_id,created_at desc);
create index if not exists email_outbox_status_idx on public.email_outbox(status,created_at) where status in ('Pending','Failed');
create index if not exists email_outbox_org_idx on public.email_outbox(organization_id) where organization_id is not null;

alter table public.plan_catalog enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.billing_events enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
create policy plan_catalog_public_select on public.plan_catalog for select to anon,authenticated using (is_public or (select auth.role())='authenticated');
create policy billing_account_select on public.billing_accounts for select to authenticated using (private.is_org_member(organization_id));
create policy billing_events_select on public.billing_events for select to authenticated using (organization_id is not null and private.can_manage_team(organization_id));
create policy notifications_select on public.notifications for select to authenticated using (private.is_org_member(organization_id) and (user_id is null or user_id=(select auth.uid())));
create policy notifications_update on public.notifications for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy email_outbox_select_admin on public.email_outbox for select to authenticated using (organization_id is not null and private.can_manage_team(organization_id));
grant select on public.plan_catalog to anon,authenticated;
grant select on public.billing_accounts to authenticated;
grant select on public.billing_events to authenticated;
grant select,update on public.notifications to authenticated;
grant select on public.email_outbox to authenticated;

create or replace function private.create_trial_billing() returns trigger language plpgsql security definer set search_path=''
as $$begin insert into public.billing_accounts(organization_id,provider,plan_code,status,trial_ends_at) values(new.id,'unconfigured','trial','trialing',now()+interval '14 days') on conflict(organization_id) do nothing;return new;end$$;
revoke all on function private.create_trial_billing() from public;
drop trigger if exists organizations_create_trial_billing on public.organizations;
create trigger organizations_create_trial_billing after insert on public.organizations for each row execute function private.create_trial_billing();
insert into public.billing_accounts(organization_id,provider,plan_code,status,trial_ends_at)
select o.id,'unconfigured','trial','trialing',o.created_at+interval '14 days' from public.organizations o
where not exists(select 1 from public.billing_accounts b where b.organization_id=o.id);

create or replace function private.plan_limit(org_id uuid,limit_key text) returns integer language sql stable security definer set search_path=''
as $$select case limit_key when 'seats' then p.seats_limit when 'projects' then p.projects_limit when 'ai_runs_monthly' then p.ai_runs_monthly_limit when 'storage_gb' then p.storage_gb_limit else null end from public.billing_accounts b join public.plan_catalog p on p.code=b.plan_code where b.organization_id=org_id and (b.status='active' or (b.status='trialing' and (b.trial_ends_at is null or b.trial_ends_at>now())))$$;
revoke all on function private.plan_limit(uuid,text) from public;
grant execute on function private.plan_limit(uuid,text) to authenticated;

create or replace function private.enforce_member_limit() returns trigger language plpgsql security definer set search_path=''
as $$declare v_limit integer;v_count integer;begin v_limit:=private.plan_limit(new.organization_id,'seats');if v_limit is null then return new;end if;select count(*) into v_count from public.organization_members where organization_id=new.organization_id;if v_count>=v_limit then raise exception 'plan seat limit reached';end if;return new;end$$;
revoke all on function private.enforce_member_limit() from public;
drop trigger if exists organization_members_plan_limit on public.organization_members;
create trigger organization_members_plan_limit before insert on public.organization_members for each row execute function private.enforce_member_limit();

create or replace function private.enforce_project_limit() returns trigger language plpgsql security definer set search_path=''
as $$declare v_limit integer;v_count integer;begin v_limit:=private.plan_limit(new.organization_id,'projects');if v_limit is null then return new;end if;select count(*) into v_count from public.projects where organization_id=new.organization_id;if v_count>=v_limit then raise exception 'plan project limit reached';end if;return new;end$$;
revoke all on function private.enforce_project_limit() from public;
drop trigger if exists projects_plan_limit on public.projects;
create trigger projects_plan_limit before insert on public.projects for each row execute function private.enforce_project_limit();

create or replace function private.queue_team_invitation_email() returns trigger language plpgsql security definer set search_path=''
as $$declare v_org_name text;begin select name into v_org_name from public.organizations where id=new.organization_id;insert into public.email_outbox(organization_id,recipient,template,subject,payload) values(new.organization_id,new.email,'team_invitation','You have been invited to '||coalesce(v_org_name,'a contract intelligence workspace'),jsonb_build_object('token',new.token,'organization_name',v_org_name,'role',new.role,'expires_at',new.expires_at));return new;end$$;
revoke all on function private.queue_team_invitation_email() from public;
drop trigger if exists team_invitation_queue_email on public.team_invitations;
create trigger team_invitation_queue_email after insert on public.team_invitations for each row execute function private.queue_team_invitation_email();

create or replace function private.queue_document_assignment_notification() returns trigger language plpgsql security definer set search_path=''
as $$declare v_email text;v_doc text;begin if new.assignee_user_id is null then return new;end if;select email into v_email from public.organization_members where organization_id=new.organization_id and user_id=new.assignee_user_id;select file_name into v_doc from public.documents where id=new.document_id;insert into public.notifications(organization_id,user_id,kind,title,body,href) values(new.organization_id,new.assignee_user_id,'document_assignment','Document assigned for action',coalesce(v_doc,'Document')||': '||new.instruction,'/documents');if v_email is not null then insert into public.email_outbox(organization_id,recipient,template,subject,payload) values(new.organization_id,v_email,'document_assignment','Document assigned for action',jsonb_build_object('document_name',v_doc,'instruction',new.instruction,'priority',new.priority,'due_at',new.due_at));end if;return new;end$$;
revoke all on function private.queue_document_assignment_notification() from public;
drop trigger if exists document_assignment_queue_notification on public.document_assignments;
create trigger document_assignment_queue_notification after insert on public.document_assignments for each row execute function private.queue_document_assignment_notification();
