#!/usr/bin/env python3
"""GC-05 isolated PostgreSQL concurrency acceptance. No cloud access or real project data.
Requires Docker and a local PostgreSQL 17 image, downloads it if absent.
Run from any directory; uses a disposable container with no published ports.
"""
import pathlib, subprocess, uuid, time, concurrent.futures, re, os

ROOT=pathlib.Path(__file__).resolve().parent
SQL=(ROOT/"controlled-ai-transaction.sql").read_text()
# GC-05 tests only: install the exact reservation/consume/failure functions
# from the candidate. The full completion transaction needs migrations 001–015.
start=SQL.index("-- Single RPC transaction")
ddl=SQL[:start].replace("begin;","",1)
ddl += """
revoke all on function public.reserve_controlled_ai(uuid,uuid,uuid,integer),public.consume_controlled_ai(uuid,text),public.fail_controlled_ai(uuid) from public,anon,authenticated;
grant execute on function public.reserve_controlled_ai(uuid,uuid,uuid,integer),public.consume_controlled_ai(uuid,text),public.fail_controlled_ai(uuid) to service_role;
"""
# Synthetic prerequisite tables deliberately model only GC-05 dependencies.
fixture="""
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
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
        check(f"""
insert into auth.users values ('{actor}'),('{other}');
insert into public.organizations values ('{org}'),('{org2}');
insert into public.contracts values ('{c1}','{org}'),('{c2}','{org2}');
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
        print("GC-05 fixture acceptance PASSED; full Supabase schema and live endpoint not tested")
    finally:
        docker("rm","-f",name)
if __name__=="__main__": run()
