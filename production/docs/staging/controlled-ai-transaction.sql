-- STAGING SQL CANDIDATE ONLY. Not in migrations; do not apply to production.
-- Requires migrations 001–015. Service-role-only RPC; authenticated server
-- must derive actor from verified claims. No privileged key in browser.
begin;
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
  if j.state<>'reserved' or j.attempts_used>=j.attempts_reserved or j.period<>date_trunc('month',now() at time zone 'UTC')::date then raise exception 'Reservation unavailable'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=j.organization_id and m.user_id=j.actor_id and m.role::text in ('owner','admin','contract_manager','contributor','reviewer')) then raise exception 'Unauthorized'; end if;
  if not exists(select 1 from public.controlled_ai_limits l where l.organization_id=j.organization_id and p_provider=any(l.approved_providers)) then raise exception 'Provider not approved'; end if;
  update public.controlled_ai_jobs set attempts_used=attempts_used+1,provider_history=array_append(provider_history,p_provider) where id=p_job;
end $$;

-- Single RPC transaction: either all canonical records commit, or none.
create function public.finish_controlled_ai(p_job uuid,p_provider text,p_model text,p_proposal jsonb,p_evidence uuid[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare j public.controlled_ai_jobs%rowtype; c public.contracts%rowtype; v_run uuid; v_output uuid; v_gap uuid; v_count integer;
begin
  select * into strict j from public.controlled_ai_jobs where id=p_job for update;
  if j.state='completed' then return j.gap_id; end if;
  if j.state<>'reserved' or j.attempts_used=0 or not coalesce(p_provider=any(j.provider_history),false) then raise exception 'Invalid completion'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=j.organization_id and m.user_id=j.actor_id and m.role::text in ('owner','admin','contract_manager','contributor','reviewer')) then raise exception 'Unauthorized'; end if;
  select * into strict c from public.contracts where id=j.contract_id and organization_id=j.organization_id;
  if coalesce(cardinality(p_evidence),0)=0 or cardinality(p_evidence)>100 then raise exception 'Evidence required'; end if;
  select count(*) into v_count from (select e.id from public.evidence e join public.document_versions v on v.id=e.document_version_id and v.document_id=e.document_id and v.organization_id=e.organization_id where e.id=any(p_evidence) and e.organization_id=j.organization_id and e.contract_id=c.id and e.project_id=c.project_id and v.is_current and v.processing_status='ready' for share of e,v) q;
  if v_count<>cardinality(p_evidence) then raise exception 'Invalid, duplicate or superseded evidence'; end if;
  if p_proposal is null or jsonb_typeof(p_proposal)<>'object' or octet_length(p_proposal::text)>64000 or nullif(trim(p_model),'') is null then raise exception 'Invalid result'; end if;
  insert into public.ai_runs(organization_id,project_id,provider,model,task_type,status,prompt_version,created_by)
  values(j.organization_id,c.project_id,p_provider,p_model,'controlled_gap_review','completed','controlled-v1',j.actor_id) returning id into v_run;
  insert into public.ai_outputs(organization_id,ai_run_id,output_type,schema_version,output_json,reviewer_outcome)
  values(j.organization_id,v_run,'gap_candidate','controlled-v1',p_proposal||jsonb_build_object('status','Under Review','evidence_ids',to_jsonb(p_evidence)),'pending') returning id into v_output;
  insert into public.gaps(organization_id,project_id,contract_id,what_is,what_ought_to_be,why,gap,impact,action,status,source_kind,ai_run_id,created_by)
  values(j.organization_id,c.project_id,c.id,p_proposal->>'what_is',p_proposal->>'what_ought_to_be',p_proposal->>'why',p_proposal->>'gap',p_proposal->>'impact',p_proposal->>'action','Under Review','ai',v_run,j.actor_id) returning id into v_gap;
  insert into public.gap_evidence(gap_id,document_id,locator,evidence_kind,evidence_id,note)
  select v_gap,e.document_id,e.source_locator,case when e.evidence_kind='contradictory' then 'contradictory' else 'supporting' end,e.id,'Independent human verification required' from public.evidence e where e.id=any(p_evidence);
  insert into public.ai_citations(organization_id,ai_output_id,evidence_id,citation_label)
  select j.organization_id,v_output,e.id,e.source_locator from public.evidence e where e.id=any(p_evidence);
  insert into public.audit_events(organization_id,actor_user_id,object_type,object_id,action,new_value)
  values(j.organization_id,j.actor_id,'gap',v_gap::text,'controlled_ai_candidate',jsonb_build_object('job_id',j.id,'run_id',v_run,'status','Under Review'));
  update public.controlled_ai_jobs set state='completed',gap_id=v_gap where id=j.id;
  return v_gap;
end $$;
revoke all on function public.reserve_controlled_ai(uuid,uuid,uuid,integer),public.consume_controlled_ai(uuid,text),public.finish_controlled_ai(uuid,text,text,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.reserve_controlled_ai(uuid,uuid,uuid,integer),public.consume_controlled_ai(uuid,text),public.finish_controlled_ai(uuid,text,text,jsonb,uuid[]) to service_role;
commit;
