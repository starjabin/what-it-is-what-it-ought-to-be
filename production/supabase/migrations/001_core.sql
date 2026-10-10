create extension if not exists pgcrypto;

create type public.member_role as enum ('owner','admin','contract_manager','contributor','reviewer','executive_viewer','external_viewer');
create type public.gap_status as enum ('Detected','Under Review','Confirmed','Action Required','In Progress','Resolved','Closed');
create type public.gap_severity as enum ('Critical','High','Medium','Low','Informational');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text not null default 'Global / International',
  currency char(3) not null default 'USD',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'contributor',
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create or replace function public.bootstrap_org_owner() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.organization_members(organization_id,user_id,role) values(new.id,new.created_by,'owner');
  return new;
end $$;
create trigger organizations_bootstrap_owner after insert on public.organizations for each row execute function public.bootstrap_org_owner();

create or replace function public.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid())
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  market text not null default 'Global / International',
  status text not null default 'Execution',
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  contract_number text,
  title text not null,
  counterparty text,
  currency char(3),
  contract_value numeric(18,2),
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  file_name text not null,
  document_type text,
  storage_path text not null,
  content_hash text,
  version_no integer not null default 1,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  model text not null,
  task_type text not null,
  response_id text,
  status text not null,
  prompt_version text,
  input_tokens bigint,
  output_tokens bigint,
  cost_minor_units bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.gaps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  what_is text not null,
  what_ought_to_be text not null,
  why text not null,
  gap text not null,
  impact text not null,
  action text not null,
  owner_user_id uuid references auth.users(id),
  owner_label text,
  deadline date,
  status public.gap_status not null default 'Detected',
  severity public.gap_severity not null default 'Medium',
  confidence text check (confidence in ('High','Medium','Low')),
  source_kind text not null default 'human' check(source_kind in ('human','ai')),
  ai_run_id uuid references public.ai_runs(id) on delete set null,
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gap_evidence (
  gap_id uuid not null references public.gaps(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  locator text not null default '',
  evidence_kind text not null default 'supporting' check(evidence_kind in ('supporting','contradictory')),
  note text,
  primary key(gap_id,document_id,locator)
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  gap_id uuid references public.gaps(id) on delete cascade,
  action_text text not null,
  owner_user_id uuid references auth.users(id),
  owner_label text,
  due_at date,
  status text not null default 'Open' check(status in ('Open','In Progress','Blocked','Done')),
  completion_evidence text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  object_type text not null,
  object_id text not null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index projects_org_idx on public.projects(organization_id);
create index contracts_org_project_idx on public.contracts(organization_id,project_id);
create index documents_org_project_idx on public.documents(organization_id,project_id);
create index gaps_org_status_severity_idx on public.gaps(organization_id,status,severity);
create index actions_org_due_idx on public.actions(organization_id,due_at) where status <> 'Done';
create index audit_org_created_idx on public.audit_events(organization_id,created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.contracts enable row level security;
alter table public.documents enable row level security;
alter table public.ai_runs enable row level security;
alter table public.gaps enable row level security;
alter table public.gap_evidence enable row level security;
alter table public.actions enable row level security;
alter table public.audit_events enable row level security;

create policy org_insert on public.organizations for insert to authenticated with check(created_by=auth.uid());
create policy org_select on public.organizations for select to authenticated using(public.is_org_member(id));
create policy member_select on public.organization_members for select to authenticated using(public.is_org_member(organization_id));
create policy project_all on public.projects for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy contract_all on public.contracts for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy document_all on public.documents for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy ai_run_all on public.ai_runs for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy gap_all on public.gaps for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy gap_evidence_all on public.gap_evidence for all to authenticated using(exists(select 1 from public.gaps g where g.id=gap_id and public.is_org_member(g.organization_id))) with check(exists(select 1 from public.gaps g where g.id=gap_id and public.is_org_member(g.organization_id)));
create policy action_all on public.actions for all to authenticated using(public.is_org_member(organization_id)) with check(public.is_org_member(organization_id));
create policy audit_select on public.audit_events for select to authenticated using(public.is_org_member(organization_id));
create policy audit_insert on public.audit_events for insert to authenticated with check(public.is_org_member(organization_id));
revoke update, delete on public.audit_events from authenticated;
