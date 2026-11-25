-- Synthetic staging graph only. No production data or real user identities.
-- Requires the existing isolated GC-05 fixture. Run once on gap_controls_staging.
create schema gap_graph;
revoke all on schema gap_graph from public;
create table gap_graph.runs (
 request_id uuid primary key,
 job_id uuid unique not null references public.controlled_ai_jobs(id),
 observed integer not null check(observed between 1 and 10000),
 required integer not null check(required between 1 and 10000),
 gap integer not null,
 outcome text not null check(outcome in ('Under Review','No discrepancy detected')),
 created_at timestamptz not null default now()
);
create table gap_graph.events (
 request_id uuid not null references gap_graph.runs(request_id),
 step integer not null check(step between 1 and 4),
 role text not null check(role in ('Planner','Coder','Tester','Reviewer')),
 result text not null,
 primary key(request_id,step)
);
revoke all on all tables in schema gap_graph from public;
insert into public.organizations(id) values ('10000000-0000-4000-8000-000000000001');
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000002');
insert into public.contracts(id,organization_id) values ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001');
insert into public.organization_members(organization_id,user_id,role) values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','owner');
insert into public.billing_accounts(organization_id,plan_code,status,trial_ends_at) values ('10000000-0000-4000-8000-000000000001','test','active',null);
insert into public.controlled_ai_limits(organization_id,monthly_attempt_cap,approved_providers) values ('10000000-0000-4000-8000-000000000001',80,array['synthetic']);
create function gap_graph.run_review(p_request uuid,p_observed integer,p_required integer)
returns jsonb language plpgsql security definer set search_path='' as $graph$
declare j uuid; existing gap_graph.runs%rowtype; delta integer; state text; g uuid;
begin
 if p_request is null or p_observed is null or p_required is null or p_observed not between 1 and 10000 or p_required not between 1 and 10000 then raise exception 'Invalid synthetic fixture'; end if;
 perform pg_advisory_xact_lock(834795);
 select * into existing from gap_graph.runs where request_id=p_request;
 if found then
   if existing.observed<>p_observed or existing.required<>p_required then raise exception 'Request replay mismatch'; end if;
   return to_jsonb(existing);
 end if;
 j:=public.reserve_controlled_ai('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002',p_request,4);
 perform public.consume_controlled_ai(j,'synthetic');
 perform public.consume_controlled_ai(j,'synthetic');
 delta:=greatest(p_required-p_observed,0);
 perform public.consume_controlled_ai(j,'synthetic');
 state:=case when delta>0 then 'Under Review' else 'No discrepancy detected' end;
 perform public.consume_controlled_ai(j,'synthetic');
 insert into gap_graph.runs(request_id,job_id,observed,required,gap,outcome) values(p_request,j,p_observed,p_required,delta,state) returning * into existing;
 insert into gap_graph.events values(p_request,1,'Planner','Synthetic evidence and requirement scoped'),(p_request,2,'Coder','Deterministic clearance comparison'),(p_request,3,'Tester','Bounds and discrepancy checked'),(p_request,4,'Reviewer','Candidate only; independent human approval required');
 insert into public.gaps(id) values(gen_random_uuid()) returning id into g;
 update public.controlled_ai_jobs set state='completed',gap_id=g where id=j;
 return to_jsonb(existing);
end $graph$;
revoke all on function gap_graph.run_review(uuid,integer,integer) from public;
create function gap_graph.recent_reviews() returns jsonb language sql security definer set search_path='' as $graph$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from (select * from gap_graph.runs order by created_at desc limit 20) r
$graph$;
revoke all on function gap_graph.recent_reviews() from public;
