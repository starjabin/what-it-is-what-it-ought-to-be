-- GC-05 NEON STAGING FIXTURE ONLY. Fresh empty dedicated database, never production.
-- Synthetic identity tables are not an authentication service.
-- Based on verified CI commit 62d40f5b5361a2fd7e81ebb0f2e6b8e25358dfa5.
begin;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key);
create table public.organizations(id uuid primary key);
create table public.contracts(id uuid primary key, organization_id uuid not null references public.organizations);
create table public.organization_members(organization_id uuid references public.organizations, user_id uuid references auth.users, role text not null, primary key(organization_id,user_id));
create table public.plan_catalog(code text primary key, ai_runs_monthly_limit integer);
create table public.billing_accounts(organization_id uuid primary key references public.organizations, plan_code text references public.plan_catalog, status text, trial_ends_at timestamptz);
create table public.ai_runs(id uuid primary key default gen_random_uuid(), organization_id uuid, task_type text not null, created_at timestamptz default now());
create table public.gaps(id uuid primary key);
grant usage on schema public,auth to service_role;
grant select on all tables in schema public,auth to service_role;

-- STAGING SQL CANDIDATE ONLY. Not in migrations; do not apply to production.
-- Requires migrations 001–015. Service-role-only RPC; authenticated server
-- must derive actor from verified claims. No privileged key in browser.

create table public.controlled_ai_limits (
  organization_id uuid primary key references public.organizations(id),
  monthly_attempt_cap integer not null check (monthly_attempt_cap > 0),
  approved_providers text[] not null check (cardinality(approved_providers)>0)
);
create table public.controlled_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  contract_id uuid not null references public.contracts(id),
  actor_id uuid not null references auth.users(id),
  request_id uuid not null,
  period date not null,
  attempts_reserved integer not null check(attempts_reserved between 1 and 8),
  attempts_used integer not null default 0 check(attempts_used >= 0 and attempts_used <= attempts_reserved),
  provider_history text[] not null default '{}',
  state text not null default 'reserved' check(state in ('reserved','completed','failed')),
  gap_id uuid references public.gaps(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '15 minutes'),
  unique(organization_id,request_id)
);
alter table public.controlled_ai_limits enable row level security;
alter table public.controlled_ai_jobs enable row level security;
revoke all on public.controlled_ai_limits,public.controlled_ai_jobs from public,anon,authenticated;
grant select,insert,update on public.controlled_ai_limits,public.controlled_ai_jobs to service_role;

create function public.reserve_controlled_ai(p_contract uuid,p_actor uuid,p_request uuid,p_attempts integer)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_org uuid; v_period date:=date_trunc('month',now() at time zone 'UTC')::date; v_cap integer; v_plan integer; v_id uuid;
begin
  if p_request is null or p_attempts is null or p_attempts not between 1 and 8 then raise exception 'Invalid reservation'; end if;
  select c.organization_id into strict v_org from public.contracts c where c.id=p_contract;
  if not exists(select 1 from public.organization_members m where m.organization_id=v_org and m.user_id=p_actor and m.role::text in ('owner','admin','contract_manager','contributor','reviewer')) then raise exception 'Unauthorized'; end if;
  select monthly_attempt_cap into strict v_cap from public.controlled_ai_limits where organization_id=v_org for update;
  -- Never allow a duplicate request to dispatch twice; caller should inspect the prior job.
  if exists(select 1 from public.controlled_ai_jobs where organization_id=v_org and request_id=p_request) then raise exception 'Duplicate request'; end if;
  select pc.ai_runs_monthly_limit into v_plan from public.billing_accounts b join public.plan_catalog pc on pc.code=b.plan_code where b.organization_id=v_org and (b.status='active' or (b.status='trialing' and b.trial_ends_at>now()));
  if not found then raise exception 'Subscription inactive'; end if;
  if coalesce((select sum(attempts_reserved) from public.controlled_ai_jobs where organization_id=v_org and period=v_period),0)+p_attempts>v_cap then raise exception 'Attempt budget exhausted'; end if;
  if v_plan is not null and (select count(*) from public.controlled_ai_jobs where organization_id=v_org and period=v_period)+(select count(*) from public.ai_runs where organization_id=v_org and task_type<>'controlled_gap_review' and created_at>=v_period::timestamp at time zone 'UTC')>=v_plan then raise exception 'Run allowance exhausted'; end if;
  insert into public.controlled_ai_jobs(organization_id,contract_id,actor_id,request_id,period,attempts_reserved) values(v_org,p_contract,p_actor,p_request,v_period,p_attempts) returning id into v_id;
  return v_id;
end $$;

create function public.consume_controlled_ai(p_job uuid,p_provider text)
returns void language plpgsql security invoker set search_path='' as $$
declare j public.controlled_ai_jobs%rowtype;
begin
  select * into strict j from public.controlled_ai_jobs where id=p_job for update;
  if j.state<>'reserved' or j.expires_at<=now() or j.attempts_used>=j.attempts_reserved or j.period<>date_trunc('month',now() at time zone 'UTC')::date then raise exception 'Reservation unavailable'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=j.organization_id and m.user_id=j.actor_id and m.role::text in ('owner','admin','contract_manager','contributor','reviewer')) then raise exception 'Unauthorized'; end if;
  if not exists(select 1 from public.billing_accounts b where b.organization_id=j.organization_id and (b.status='active' or (b.status='trialing' and b.trial_ends_at>now()))) then raise exception 'Subscription inactive'; end if;
  if not exists(select 1 from public.controlled_ai_limits l where l.organization_id=j.organization_id and p_provider=any(l.approved_providers)) then raise exception 'Provider not approved'; end if;
  update public.controlled_ai_jobs set attempts_used=attempts_used+1,provider_history=array_append(provider_history,p_provider) where id=p_job;
end $$;

-- Failure closure never refunds reserved capacity and never reverses a committed job.
create function public.fail_controlled_ai(p_job uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare j public.controlled_ai_jobs%rowtype;
begin
  select * into strict j from public.controlled_ai_jobs where id=p_job for update;
  if j.state='reserved' then
    update public.controlled_ai_jobs set state='failed' where id=j.id;
  end if;
end $$;


create policy controlled_ai_service_limits on public.controlled_ai_limits for all to service_role using (true) with check (true);
create policy controlled_ai_service_jobs on public.controlled_ai_jobs for all to service_role using (true) with check (true);
revoke all on function public.reserve_controlled_ai(uuid,uuid,uuid,integer),public.consume_controlled_ai(uuid,text),public.fail_controlled_ai(uuid) from public,anon,authenticated;
grant execute on function public.reserve_controlled_ai(uuid,uuid,uuid,integer),public.consume_controlled_ai(uuid,text),public.fail_controlled_ai(uuid) to service_role;
-- Owner membership enables controlled role simulation; this is not an app credential.
grant anon, authenticated, service_role to gap_staging_owner;
commit;
