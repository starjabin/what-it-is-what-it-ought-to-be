-- Final retrack indexes, onboarding golden path and pricing/RLS alignment.
create index if not exists document_versions_created_by_idx on public.document_versions(created_by) where created_by is not null;
create index if not exists documents_current_version_idx on public.documents(current_version_id) where current_version_id is not null;
create index if not exists projects_created_by_idx on public.projects(created_by) where created_by is not null;
create index if not exists contracts_created_by_idx on public.contracts(created_by) where created_by is not null;
create index if not exists clauses_org_idx on public.clauses(organization_id);create index if not exists clauses_project_idx on public.clauses(project_id);
create index if not exists definitions_org_idx on public.definitions(organization_id);create index if not exists definitions_project_idx on public.definitions(project_id);create index if not exists definitions_ai_run_idx on public.definitions(ai_run_id) where ai_run_id is not null;
create index if not exists obligations_org_idx on public.obligations(organization_id);create index if not exists obligations_project_idx on public.obligations(project_id);
create index if not exists evidence_project_idx on public.evidence(project_id) where project_id is not null;create index if not exists evidence_document_idx on public.evidence(document_id);create index if not exists evidence_clause_idx on public.evidence(clause_id) where clause_id is not null;create index if not exists evidence_created_by_idx on public.evidence(created_by) where created_by is not null;
create index if not exists ai_outputs_reviewed_by_idx on public.ai_outputs(reviewed_by) where reviewed_by is not null;create index if not exists ai_citations_org_idx on public.ai_citations(organization_id);create index if not exists gap_history_actor_idx on public.gap_history(actor_user_id) where actor_user_id is not null;
create index if not exists reports_project_idx on public.report_snapshots(project_id) where project_id is not null;create index if not exists reports_contract_idx on public.report_snapshots(contract_id) where contract_id is not null;create index if not exists reports_created_by_idx on public.report_snapshots(created_by) where created_by is not null;create index if not exists ai_settings_updated_by_idx on public.ai_settings(updated_by) where updated_by is not null;

update public.plan_catalog set monthly_amount_minor=69900 where code='professional';
update public.plan_catalog set monthly_amount_minor=199900 where code='business';

drop policy if exists member_invited_self_insert on public.organization_members;
create policy member_invited_self_insert on public.organization_members for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.team_invitations i where i.organization_id=organization_members.organization_id and lower(i.email)=lower(coalesce((select auth.jwt())->>'email','')) and i.status='Pending' and i.expires_at>now()));
drop policy if exists team_invitations_select on public.team_invitations;
create policy team_invitations_select on public.team_invitations for select to authenticated using(private.is_org_member(organization_id) or (lower(email)=lower(coalesce((select auth.jwt())->>'email','')) and status='Pending' and expires_at>now()));

create or replace function public.bootstrap_workspace_v3(p_display_name text,p_job_title text,p_organization_name text,p_market text,p_currency text,p_project_name text,p_project_code text,p_contract_title text,p_contract_number text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_user_id uuid:=auth.uid();v_email text:=lower(coalesce(auth.jwt()->>'email',''));v_existing_org uuid;v_existing_project uuid;v_existing_contract uuid;v_org_id uuid:=gen_random_uuid();v_project_id uuid:=gen_random_uuid();v_contract_id uuid:=gen_random_uuid();v_channel_id uuid:=gen_random_uuid();
begin
 if v_user_id is null then raise exception 'authentication required' using errcode='42501';end if;
 if length(trim(coalesce(p_display_name,'')))<2 then raise exception 'name is required';end if;
 if length(trim(coalesce(p_organization_name,'')))<2 then raise exception 'organization name is required';end if;
 if length(trim(coalesce(p_project_name,'')))<2 then raise exception 'project name is required';end if;
 if length(trim(coalesce(p_project_code,'')))<1 then raise exception 'project code is required';end if;
 if length(trim(coalesce(p_contract_title,'')))<2 then raise exception 'contract title is required';end if;
 if p_currency not in ('USD','SAR','AED','GBP','EUR') then raise exception 'unsupported currency';end if;
 select m.organization_id into v_existing_org from public.organization_members m where m.user_id=v_user_id order by m.created_at limit 1;
 if v_existing_org is not null then
  update public.organization_members set display_name=trim(p_display_name),email=v_email,job_title=nullif(trim(coalesce(p_job_title,'')),'') where organization_id=v_existing_org and user_id=v_user_id;
  select p.id into v_existing_project from public.projects p where p.organization_id=v_existing_org order by p.created_at limit 1;
  if v_existing_project is null then insert into public.projects(id,organization_id,code,name,market,status,created_by) values(v_project_id,v_existing_org,trim(p_project_code),trim(p_project_name),coalesce(nullif(trim(p_market),''),'Global / International'),'Execution',v_user_id);v_existing_project:=v_project_id;end if;
  select c.id into v_existing_contract from public.contracts c where c.project_id=v_existing_project order by c.created_at limit 1;
  if v_existing_contract is null then insert into public.contracts(id,organization_id,project_id,contract_number,title,currency,status,created_by) values(v_contract_id,v_existing_org,v_existing_project,nullif(trim(coalesce(p_contract_number,'')),''),trim(p_contract_title),p_currency,'Active',v_user_id);v_existing_contract:=v_contract_id;end if;
  insert into public.ai_settings(organization_id,updated_by) values(v_existing_org,v_user_id) on conflict(organization_id) do nothing;
  return jsonb_build_object('organization_id',v_existing_org,'project_id',v_existing_project,'contract_id',v_existing_contract,'already_exists',true);
 end if;
 insert into public.organizations(id,name,market,currency,created_by) values(v_org_id,trim(p_organization_name),coalesce(nullif(trim(p_market),''),'Global / International'),p_currency,v_user_id);
 update public.organization_members set display_name=trim(p_display_name),email=v_email,job_title=nullif(trim(coalesce(p_job_title,'')),'') where organization_id=v_org_id and user_id=v_user_id;
 insert into public.projects(id,organization_id,code,name,market,status,created_by) values(v_project_id,v_org_id,trim(p_project_code),trim(p_project_name),coalesce(nullif(trim(p_market),''),'Global / International'),'Execution',v_user_id);
 insert into public.contracts(id,organization_id,project_id,contract_number,title,currency,status,created_by) values(v_contract_id,v_org_id,v_project_id,nullif(trim(coalesce(p_contract_number,'')),''),trim(p_contract_title),p_currency,'Active',v_user_id);
 insert into public.channels(id,organization_id,project_id,name,description,created_by) values(v_channel_id,v_org_id,null,'General','Organization-wide commercial and contract coordination.',v_user_id);
 insert into public.ai_settings(organization_id,updated_by) values(v_org_id,v_user_id) on conflict(organization_id) do nothing;
 return jsonb_build_object('organization_id',v_org_id,'project_id',v_project_id,'contract_id',v_contract_id,'channel_id',v_channel_id,'already_exists',false);
end$$;
revoke all on function public.bootstrap_workspace_v3(text,text,text,text,text,text,text,text,text) from public;revoke all on function public.bootstrap_workspace_v3(text,text,text,text,text,text,text,text,text) from anon;grant execute on function public.bootstrap_workspace_v3(text,text,text,text,text,text,text,text,text) to authenticated;
