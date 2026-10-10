create or replace function public.bootstrap_workspace(
  p_organization_name text,
  p_market text,
  p_currency text,
  p_project_name text,
  p_project_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_project uuid;
  v_org_id uuid := gen_random_uuid();
  v_project_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_organization_name,''))) < 2 then raise exception 'organization name is required'; end if;
  if length(trim(coalesce(p_project_name,''))) < 2 then raise exception 'project name is required'; end if;
  if length(trim(coalesce(p_project_code,''))) < 1 then raise exception 'project code is required'; end if;
  if p_currency not in ('USD','SAR','AED','GBP','EUR') then raise exception 'unsupported currency'; end if;

  select m.organization_id into v_existing_org
  from public.organization_members m
  where m.user_id=v_user_id
  order by m.created_at
  limit 1;

  if v_existing_org is not null then
    select p.id into v_existing_project
    from public.projects p
    where p.organization_id=v_existing_org
    order by p.created_at
    limit 1;

    return jsonb_build_object(
      'organization_id',v_existing_org,
      'project_id',v_existing_project,
      'already_exists',true
    );
  end if;

  insert into public.organizations(id,name,market,currency,created_by)
  values(v_org_id,trim(p_organization_name),coalesce(nullif(trim(p_market),''),'Global / International'),p_currency,v_user_id);

  insert into public.projects(id,organization_id,code,name,market,status)
  values(v_project_id,v_org_id,trim(p_project_code),trim(p_project_name),coalesce(nullif(trim(p_market),''),'Global / International'),'Execution');

  return jsonb_build_object(
    'organization_id',v_org_id,
    'project_id',v_project_id,
    'already_exists',false
  );
end
$$;

revoke all on function public.bootstrap_workspace(text,text,text,text,text) from public;
revoke all on function public.bootstrap_workspace(text,text,text,text,text) from anon;
grant execute on function public.bootstrap_workspace(text,text,text,text,text) to authenticated;
