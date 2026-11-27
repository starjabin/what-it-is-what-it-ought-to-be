#!/usr/bin/env python3
"""Actual PostgreSQL migration and policy tests, synthetic JWT context, not live IdP or Storage service."""
import pathlib,subprocess,time,uuid,os
root=pathlib.Path(__file__).resolve().parent
name="gap-canonical-"+uuid.uuid4().hex[:10]
def docker(*args,**kw):return subprocess.run(["docker",*args],text=True,capture_output=True,timeout=120,**kw)
def sql(s):
 p=docker("exec","-i",name,"psql","-X","-qAt","-U","postgres","-d","canonical","-v","ON_ERROR_STOP=1",input=s)
 return p
def ok(s,expected=None):
 p=sql(s)
 assert p.returncode==0,(p.stdout,p.stderr)
 if expected is not None:assert p.stdout.strip().splitlines()[-1]==str(expected),(p.stdout,p.stderr,expected)
 return p.stdout
def denied(s):
 p=sql(s);assert p.returncode!=0,(p.stdout,p.stderr);assert "permission denied" in p.stderr or "row-level security" in p.stderr,(p.stdout,p.stderr)
A="10000000-0000-4000-8000-000000000001";B="10000000-0000-4000-8000-000000000002";U="20000000-0000-4000-8000-000000000001";V="20000000-0000-4000-8000-000000000002";O="20000000-0000-4000-8000-000000000003";P="30000000-0000-4000-8000-000000000001";Q="30000000-0000-4000-8000-000000000002";R="30000000-0000-4000-8000-000000000003";C="40000000-0000-4000-8000-000000000001"
def as_user(u,aal="aal2"):return f"""set role authenticated;set request.jwt.claims='{{"sub":"{u}","aal":"{aal}","role":"authenticated"}}';\n"""
try:
 p=docker("run","-d","--name",name,"--network","none","-e","POSTGRES_HOST_AUTH_METHOD=trust","-e","POSTGRES_DB=canonical",os.getenv("GC05_POSTGRES_IMAGE","postgres:17"));assert p.returncode==0,p.stderr
 for _ in range(60):
  if docker("exec",name,"pg_isready","-h","127.0.0.1","-U","postgres","-d","canonical").returncode==0:break
  time.sleep(1)
 else:raise RuntimeError("PostgreSQL startup failed")
 ok("""create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text);
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
 create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
 grant usage on schema auth to anon,authenticated,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 create function storage.foldername(n text) returns text[] language sql immutable as $$select string_to_array(n,'/')$$;
 create publication supabase_realtime;
 create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
 """)
 for path in sorted((root.parent.parent/"supabase/migrations").glob("*.sql")):
  s=path.read_text()
  # pg_cron extension unavailable in plain Postgres: scheduler only is simulated.
  s=s.replace("create extension if not exists pg_cron with schema pg_catalog;","-- cron.schedule compatibility stub")
  if path.name.startswith("013_"):s="begin;\n"+s+"\ncommit;"
  p=sql(s);assert p.returncode==0,(path.name,p.stdout[-1000:],p.stderr[-3000:])
  print("PASS canonical migration",path.name,flush=True)
 ok((root/"phase1-rls-candidate.sql").read_text())
 print("PASS candidate policy installation",flush=True)
 ok((root/"sf01-independent-review.sql").read_text())
 # Disposable Supabase compatibility fixture: mimic managed service-role grants observed in staging.
 # This is not a grant on any real database.
 ok("grant usage on schema public to service_role;grant select,insert,update,delete on public.gaps to service_role;grant select on public.projects,public.organization_members to service_role;")
 ok((root/"sf01-service-gap-guard.sql").read_text())
 review=ok((root/"sf01-review-acceptance.sql").read_text())
 assert "PASS: 14 assertions" in review and review.strip().splitlines()[-1].endswith("|0|0|0"),review
 print("PASS SF01 independent reviewer, attribution and service-role proposal restrictions; two tenants; transaction rollback",flush=True)
 ok(f"""insert into auth.users(id,email) values('{U}','a@example.invalid'),('{V}','b@example.invalid'),('{O}','owner@example.invalid');
 set request.jwt.claims='{{"sub":"{O}","aal":"aal2","role":"authenticated"}}';
 insert into public.organizations(id,name,created_by) values('{A}','Synthetic A','{O}');
 set request.jwt.claims='{{"sub":"{V}","aal":"aal2","role":"authenticated"}}';
 insert into public.organizations(id,name,created_by) values('{B}','Synthetic B','{V}');
 insert into public.organization_members(organization_id,user_id,role) values('{A}','{U}','contributor') on conflict do nothing;
 insert into public.projects(id,organization_id,code,name) values('{P}','{A}','P1','Allowed A'),('{Q}','{A}','P2','Restricted A'),('{R}','{B}','P1','Tenant B');
 insert into public.project_team_members(organization_id,project_id,user_id,assigned_by) values('{A}','{P}','{U}','{O}');
 insert into public.contracts(id,organization_id,project_id,title) values('{C}','{A}','{P}','Allowed contract');
 insert into storage.objects(bucket_id,name) values('contract-evidence','{A}/{P}/doc/v1.pdf'),('contract-evidence','{A}/{Q}/doc/v1.pdf'),('contract-evidence','{B}/{R}/doc/v1.pdf');
 """)
 ok(as_user(U)+"select count(*) from public.projects;",1)
 ok(as_user(V)+"select count(*) from public.projects;",1)
 ok(as_user(O)+"select count(*) from public.projects;",2)
 ok(as_user(U,"aal1")+"select count(*) from public.projects;",0)
 ok(as_user(U)+"select count(*) from public.contracts;",1)
 ok(as_user(V)+"select count(*) from public.contracts;",0)
 ok(as_user(U)+"select count(*) from storage.objects;",1)
 ok(as_user(U,"aal1")+"select count(*) from storage.objects;",0)
 denied(as_user(U)+"update public.organization_members set role='owner' where user_id=auth.uid();")
 denied(as_user(U)+f"insert into public.project_team_members(organization_id,project_id,user_id,assigned_by) values('{A}','{Q}','{U}','{U}');")
 denied(as_user(U)+f"insert into storage.objects(bucket_id,name) values('contract-evidence','{B}/{R}/doc/v2.pdf');")
 denied(as_user(U)+f"insert into storage.objects(bucket_id,name) values('contract-evidence','{A}/{Q}/doc/v2.pdf');")
 denied(as_user(U)+f"insert into public.contracts(organization_id,project_id,title) values('{A}','{R}','Cross tenant');")
 ok(f"delete from public.project_team_members where user_id='{U}' and project_id='{P}';")
 ok(as_user(U)+"select count(*) from public.projects;",0)
 ok(as_user(U)+"select count(*) from storage.objects;",0)
 ok("select count(*) from pg_tables where schemaname='public' and not rowsecurity;",0)
 print("PASS actual PostgreSQL two tenants, three projects, AAL1 denial, role escalation denial, storage isolation and revoked project membership",flush=True)
 print("NOT TESTED: live IdP MFA, JWT signature, Supabase storage service, cron execution, full project relationship matrix, cloud schema.",flush=True)
finally:docker("rm","-f",name)
