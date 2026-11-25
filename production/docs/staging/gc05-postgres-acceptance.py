#!/usr/bin/env python3
"""GC-05 isolated PostgreSQL concurrency acceptance. No cloud access or real project data.
Requires Docker and a local PostgreSQL 17 image, downloads it if absent.
Run from any directory; uses a disposable container with no published ports.
"""
import pathlib, subprocess, uuid, time, concurrent.futures, re, os

ROOT=pathlib.Path(__file__).resolve().parent
SQL=(ROOT/"controlled-ai-transaction.sql").read_text()
# Install exact full candidate; fixture models relevant canonical columns only.
ddl=SQL
# Synthetic prerequisite tables deliberately model only GC-05 dependencies.
fixture="""
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create table public.organizations(id uuid primary key);
create table public.contracts(id uuid primary key, organization_id uuid not null references public.organizations, project_id uuid not null);
create table public.organization_members(organization_id uuid references public.organizations, user_id uuid references auth.users, role text not null, primary key(organization_id,user_id));
create table public.plan_catalog(code text primary key, ai_runs_monthly_limit integer);
create table public.billing_accounts(organization_id uuid primary key references public.organizations, plan_code text references public.plan_catalog, status text, trial_ends_at timestamptz);
create table public.ai_runs(id uuid primary key default gen_random_uuid(), organization_id uuid, project_id uuid, provider text, model text, task_type text not null, status text, prompt_version text, created_by uuid, created_at timestamptz default now());
create table public.gaps(id uuid primary key default gen_random_uuid(), organization_id uuid, project_id uuid, contract_id uuid, what_is text not null, what_ought_to_be text not null, why text not null, gap text not null, impact text not null, action text not null,status text not null,source_kind text,ai_run_id uuid,created_by uuid);
create table public.document_versions(id uuid primary key,organization_id uuid,document_id uuid,is_current boolean,processing_status text);
create table public.evidence(id uuid primary key,organization_id uuid,project_id uuid,contract_id uuid,document_id uuid,document_version_id uuid,source_locator text,evidence_kind text);
create table public.obligations(id uuid primary key,organization_id uuid,project_id uuid,contract_id uuid,document_version_id uuid);
create table public.ai_outputs(id uuid primary key default gen_random_uuid(),organization_id uuid,ai_run_id uuid,output_type text,schema_version text,output_json jsonb,reviewer_outcome text);
create table public.gap_evidence(gap_id uuid,document_id uuid,locator text,evidence_kind text,evidence_id uuid,note text,primary key(gap_id,document_id,locator));
create table public.ai_citations(id uuid primary key default gen_random_uuid(),organization_id uuid,ai_output_id uuid,evidence_id uuid,citation_label text);
create table public.audit_events(id bigint generated always as identity primary key,organization_id uuid,actor_user_id uuid,object_type text,object_id text,action text,new_value jsonb);
grant insert on public.ai_runs,public.gaps,public.ai_outputs,public.gap_evidence,public.ai_citations,public.audit_events to service_role;
grant usage on sequence public.audit_events_id_seq to service_role;
grant usage on schema public,auth to service_role;
grant select on all tables in schema public,auth to service_role;
grant update on public.evidence,public.document_versions,public.obligations to service_role;
"""
name="gap-gc05-"+uuid.uuid4().hex[:12]
def docker(*args, **kwargs):
    return subprocess.run(["docker",*args],text=True,capture_output=True,timeout=90,**kwargs)
def query(sql, role="postgres"):
    prefix="" if role=="postgres" else f"set role {role};\n"
    return docker("exec","-i",name,"psql","-X","-qAt","-U","postgres","-d","gc05_test","-v","ON_ERROR_STOP=1",input=prefix+sql)
def check(sql, expected=None, error=None, role="postgres"):
    p=query(sql,role)
    if error is not None:
        assert p.returncode!=0 and error in p.stderr,(p.returncode,p.stdout,p.stderr)
    else:
        assert p.returncode==0,p.stderr
        if expected is not None: assert p.stdout.strip()==expected,(p.stdout,expected)
    return p.stdout.strip()
def ident(n): return f"00000000-0000-4000-8000-{n:012d}"
org,org2,actor,other,c1,c2=map(ident,[1,2,3,4,5,6])
def reserve(contract,user,req,n):
    return f"select public.reserve_controlled_ai('{contract}','{user}','{req}',{n});"
def run():
    p=docker("run","--detach","--rm","--name",name,"--network","none","-e","POSTGRES_HOST_AUTH_METHOD=trust","-e","POSTGRES_DB=gc05_test",os.environ.get("GC05_POSTGRES_IMAGE","postgres:17"))
    assert p.returncode==0,p.stderr
    try:
        for _ in range(45):
            if docker("exec",name,"psql","-h","127.0.0.1","-X","-qAt","-U","postgres","-d","gc05_test","-c","select 1").returncode==0: break
            time.sleep(1)
        else: raise RuntimeError("PostgreSQL never became ready")
        check(fixture)
        check(ddl)
        check((ROOT/"security-event-store.sql").read_text())
        check(f"""
insert into auth.users values ('{actor}'),('{other}');
insert into public.organizations values ('{org}'),('{org2}');
insert into public.contracts values ('{c1}','{org}','{ident(20)}'),('{c2}','{org2}','{ident(21)}');
insert into public.organization_members values ('{org}','{actor}','owner'),('{org2}','{other}','owner');
insert into public.plan_catalog values ('test',100);
insert into public.billing_accounts values ('{org}','test','active',null),('{org2}','test','active',null);
insert into public.controlled_ai_limits values ('{org}',8,array['openai']),('{org2}',8,array['openai']);
""")
        # Independent client sessions contend on the same tenant limit row.
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            results=list(pool.map(lambda i:query(reserve(c1,actor,ident(100+i),4),"service_role"),range(12)))
        wins=[p.stdout.strip() for p in results if p.returncode==0]
        losses=[p for p in results if p.returncode!=0]
        assert len(wins)==2 and len(losses)==10 and all("Attempt budget exhausted" in p.stderr for p in losses), [(p.returncode,p.stderr) for p in results]
        check(f"select sum(attempts_reserved) from public.controlled_ai_jobs where organization_id='{org}';","8")
        print("PASS concurrent reservations: 2 accepted, 10 denied, 8 reserved")
        job=wins[0]
        # Ten concurrent debits against one four-attempt reservation.
        debit=f"select public.consume_controlled_ai('{job}','openai');"
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            results=list(pool.map(lambda _:query(debit,"service_role"),range(10)))
        assert sum(p.returncode==0 for p in results)==4
        assert all("Reservation unavailable" in p.stderr for p in results if p.returncode)
        check(f"select attempts_used from public.controlled_ai_jobs where id='{job}';","4")
        print("PASS concurrent debits: 4 accepted, 6 denied")
        check(reserve(c2,actor,ident(500),1),error="Unauthorized",role="service_role")
        check(reserve(c2,other,ident(501),1),error="permission denied",role="authenticated")
        check(reserve(c2,other,ident(502),1),error="permission denied",role="anon")
        print("PASS tenant and role isolation")
        j2=check(reserve(c2,other,ident(503),4),role="service_role")
        check(reserve(c2,other,ident(503),4),error="Duplicate request",role="service_role")
        check(f"select public.consume_controlled_ai('{j2}','unapproved');",error="Provider not approved",role="service_role")
        check(f"update public.billing_accounts set status='paused' where organization_id='{org2}';")
        check(f"select public.consume_controlled_ai('{j2}','openai');",error="Subscription inactive",role="service_role")
        check(f"update public.billing_accounts set status='active' where organization_id='{org2}'; update public.controlled_ai_jobs set expires_at=now()-interval '1 second' where id='{j2}';")
        check(f"select public.consume_controlled_ai('{j2}','openai');",error="Reservation unavailable",role="service_role")
        check(f"select public.fail_controlled_ai('{j2}');",role="service_role")
        check(f"select public.fail_controlled_ai('{j2}');",role="service_role")
        check(f"select state||':'||attempts_used from public.controlled_ai_jobs where id='{j2}';","failed:0")
        check(f"select sum(attempts_reserved) from public.controlled_ai_jobs where organization_id='{org2}';","4")
        print("PASS duplicate, provider policy, subscription, expiry, idempotent failure/no refund")
        # Atomic candidate completion, source scope and protected audit.
        # The first job has four actual debits and is still reserved.
        ev,ob,rev,doc,project=map(ident,[600,601,602,603,20])
        check(f"""
insert into public.document_versions values ('{rev}','{org}','{doc}',true,'ready');
insert into public.evidence values ('{ev}','{org}','{project}','{c1}','{doc}','{rev}','page 1','source');
insert into public.obligations values ('{ob}','{org}','{project}','{c1}','{rev}');
""")
        proposal='{"what_is":"650 mm","what_ought_to_be":"800 mm","why":"review","gap":"difference","impact":"review required","action":"verify","status":"Confirmed"}'
        def finish(evidence=ev,obligation=ob):
            return f"select public.finish_controlled_ai('{job}','openai','synthetic','{proposal}'::jsonb,array['{evidence}'::uuid],array['{obligation}'::uuid]);"
        check(finish(obligation=ident(999)),error="Invalid, duplicate or superseded obligation",role="service_role")
        check(f"update public.document_versions set is_current=false where id='{rev}';")
        check(finish(),error="Invalid, duplicate or superseded evidence",role="service_role")
        check(f"update public.document_versions set is_current=true where id='{rev}';")
        check("create function public.fixture_force_failure() returns trigger language plpgsql as $fixture$ begin raise exception 'fixture forced failure'; end $fixture$; create trigger fixture_failure before insert on public.audit_events for each row execute function public.fixture_force_failure();")
        check(finish(),error="fixture forced failure",role="service_role")
        for table in ["ai_runs","ai_outputs","gaps","gap_evidence","ai_citations","audit_events"]:
            check(f"select count(*) from public.{table};","0")
        check(f"select state from public.controlled_ai_jobs where id='{job}';","reserved")
        check("drop trigger fixture_failure on public.audit_events;")
        gap=check(finish(),role="service_role")
        check(finish(),gap,role="service_role")
        check("select status from public.gaps;","Under Review")
        for table in ["ai_runs","ai_outputs","gaps","gap_evidence","ai_citations","audit_events"]:
            check(f"select count(*) from public.{table};","1")
        print("PASS atomic completion: rollback on late failure, evidence/obligation scope, one candidate on replay, Under Review")
        event=f"select public.append_ai_security_event('{org}','{actor}','{ident(700)}','authorized','none');"
        check(event,role="service_role")
        check(event,role="authenticated",error="permission denied")
        check(f"select public.append_ai_security_event('{org2}','{actor}','{ident(700)}','blocked','scope');",role="service_role",error="Security event scope denied")
        check("update public.ai_security_events set reason_code='policy';",role="service_role",error="permission denied")
        check("delete from public.ai_security_events;",role="service_role",error="permission denied")
        check("select count(*) from public.ai_security_events;","1")
        print("PASS protected metadata audit: append RPC, cross-tenant/direct client denial, no service mutation")
        print("GC-05 and atomic security fixture acceptance PASSED; full Supabase schema and live endpoint not tested")
    finally:
        docker("rm","-f",name)
if __name__=="__main__": run()
