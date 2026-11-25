-- Candidate for independent review and fresh staging only. Never apply to existing production.
-- Supabase verified JWT claims; the test harness simulates these at the database boundary.
create or replace function private.phase1_mfa() returns boolean language sql stable set search_path='' as $$select coalesce(auth.jwt()->>'aal'='aal2',false)$$;
create or replace function private.phase1_org_admin(o uuid) returns boolean language sql stable security definer set search_path='' as $$select private.phase1_mfa() and exists(select 1 from public.organization_members m where m.organization_id=o and m.user_id=auth.uid() and m.role in ('owner','admin'))$$;
create or replace function private.phase1_project(o uuid,p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.phase1_mfa() and exists(select 1 from public.projects x join public.organization_members m on m.organization_id=x.organization_id and m.user_id=auth.uid() where x.id=p and x.organization_id=o and (m.role in ('owner','admin') or exists(select 1 from public.project_team_members t where t.organization_id=o and t.project_id=p and t.user_id=auth.uid())))
$$;
revoke all on function private.phase1_mfa(),private.phase1_org_admin(uuid),private.phase1_project(uuid,uuid) from public;
grant execute on function private.phase1_mfa(),private.phase1_org_admin(uuid),private.phase1_project(uuid,uuid) to authenticated;
-- All existing tenant tables require MFA even where a legacy permissive policy grants access.
do $phase$
declare t record; expr text;
begin
 for t in select tablename from pg_catalog.pg_tables where schemaname='public' and tablename<>'plan_catalog' loop
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('create policy phase1_mfa on public.%I as restrictive for all to authenticated using (private.phase1_mfa()) with check (private.phase1_mfa())',t.tablename);
 end loop;
 -- All directly project-scoped tables; no project means administrator only, except approved org collaboration handled later.
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='project_id' and table_name in (select table_name from information_schema.columns where table_schema='public' and column_name='organization_id') loop
  expr:='(case when project_id is null then private.phase1_org_admin(organization_id) else private.phase1_project(organization_id,project_id) end)';
  execute format('create policy phase1_project_scope on public.%I as restrictive for all to authenticated using (%s) with check (%s)',t.table_name,expr,expr);
 end loop;
end $phase$;
create policy phase1_project_scope on public.projects as restrictive for all to authenticated using(private.phase1_project(organization_id,id)) with check(private.phase1_org_admin(organization_id) or private.phase1_project(organization_id,id));
-- Project membership changes reserved for organization admins, not a project contributor/coordinator.
create policy phase1_project_membership_insert on public.project_team_members as restrictive for insert to authenticated with check(private.phase1_org_admin(organization_id));
create policy phase1_project_membership_update on public.project_team_members as restrictive for update to authenticated using(private.phase1_org_admin(organization_id)) with check(private.phase1_org_admin(organization_id));
create policy phase1_project_membership_delete on public.project_team_members as restrictive for delete to authenticated using(private.phase1_org_admin(organization_id));
-- Restrict role changes and direct invitation acceptance; reviewed admin-mediated membership flow required.
revoke insert,update on public.organization_members from authenticated;
grant update(display_name,job_title) on public.organization_members to authenticated;
-- Legacy invite and bootstrap RPCs are held until safe replacements are accepted (bootstrap uses member email update).
do $phase$
declare f record;
begin for f in select p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'bootstrap_workspace%' or p.proname='accept_team_invitation') loop
 execute format('revoke execute on function %s from public,anon,authenticated',f.sig);
end loop;end $phase$;
-- Indirect project relationships resolved via existing row-level policies on their parent.
do $phase$
declare x record; expr text;
begin
 for x in select * from (values
 ('document_versions','document_id','documents'),('actions','gap_id','gaps'),('gap_history','gap_id','gaps'),('ai_outputs','ai_run_id','ai_runs'),('ai_citations','ai_output_id','ai_outputs'),('ai_citations','evidence_id','evidence'),('contract_team_members','contract_id','contracts'),('document_assignments','document_id','documents'),('work_item_events','work_item_id','work_items'),('messages','channel_id','channels')
 ) v(child,col,parent) loop
  expr:=format('exists (select 1 from public.%I p where p.id=%I.%I and p.organization_id=%I.organization_id)',x.parent,x.child,x.col,x.child);
  execute format('create policy %I on public.%I as restrictive for all to authenticated using (%s) with check (%s)','phase1_parent_'||x.col,x.child,expr,expr);
 end loop;
end $phase$;
create policy phase1_gap_evidence_scope on public.gap_evidence as restrictive for all to authenticated using(exists(select 1 from public.gaps g join public.documents d on d.organization_id=g.organization_id and d.project_id=g.project_id where g.id=gap_evidence.gap_id and d.id=gap_evidence.document_id)) with check(exists(select 1 from public.gaps g join public.documents d on d.organization_id=g.organization_id and d.project_id=g.project_id where g.id=gap_evidence.gap_id and d.id=gap_evidence.document_id));
-- Ensure direct references cannot link to a different tenant/project. Parent RLS is part of this guard.
do $phase$
declare x record; expr text;
begin
 for x in select table_name,column_name from information_schema.columns where table_schema='public' and column_name in ('contract_id','document_id','document_version_id','gap_id','ai_run_id') and table_name in (select table_name from information_schema.columns where table_schema='public' and column_name='project_id') loop
  expr:=case x.column_name when 'contract_id' then 'contracts' when 'document_id' then 'documents' when 'document_version_id' then 'document_versions' when 'gap_id' then 'gaps' else 'ai_runs' end;
  if x.column_name='document_version_id' then
   expr:=format('(%I is null or exists(select 1 from public.document_versions v join public.documents p on p.id=v.document_id where v.id=%I.%I and p.organization_id=%I.organization_id and p.project_id=%I.project_id))',x.column_name,x.table_name,x.column_name,x.table_name,x.table_name);
  else
   expr:=format('(%I is null or exists(select 1 from public.%I p where p.id=%I.%I and p.organization_id=%I.organization_id and p.project_id=%I.project_id))',x.column_name,expr,x.table_name,x.column_name,x.table_name,x.table_name);
  end if;
  execute format('create policy %I on public.%I as restrictive for all to authenticated using (%s) with check (%s)','phase1_context_'||x.column_name,x.table_name,expr,expr);
 end loop;
end $phase$;
-- Audit and organization-wide reports may contain project data. Restrict audit/billing metadata to administrators.
create policy phase1_audit_scope on public.audit_events as restrictive for all to authenticated using(private.phase1_org_admin(organization_id)) with check(private.phase1_org_admin(organization_id));
revoke insert,update,delete on public.audit_events from authenticated;
-- Storage path: org/project/document/version (current uploader). Malformed paths fail closed.
create or replace function private.phase1_storage_project(n text) returns boolean language plpgsql stable set search_path='' as $$
declare parts text[]:=string_to_array(n,'/');
begin
 if array_length(parts,1)<4 or parts[1]!~*'^[0-9a-f-]{36}$' or parts[2]!~*'^[0-9a-f-]{36}$' then return false;end if;
 return private.phase1_project(parts[1]::uuid,parts[2]::uuid);
exception when invalid_text_representation then return false;
end$$;
revoke all on function private.phase1_storage_project(text) from public;
grant execute on function private.phase1_storage_project(text) to authenticated;
create policy phase1_storage_scope on storage.objects as restrictive for all to authenticated using(bucket_id='contract-evidence' and private.phase1_storage_project(name)) with check(bucket_id='contract-evidence' and private.phase1_storage_project(name));
