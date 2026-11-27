-- Dedicated identity staging only. Source retention requires an approved separate process.
-- This protects registered revision metadata and authenticated storage writes, not service-role object bytes.
create or replace function private.sf01_document_scope_guard() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then
  if exists(select 1 from public.document_versions v where v.document_id=old.id) then
   raise exception 'SF01-EVIDENCE: registered document requires governed retention workflow';
  end if;
  return old;
 end if;
 if new.organization_id is distinct from old.organization_id or new.project_id is distinct from old.project_id or new.contract_id is distinct from old.contract_id then
  raise exception 'SF01-EVIDENCE: document scope is immutable';
 end if;
 return new;
end $$;
revoke all on function private.sf01_document_scope_guard() from public,anon,authenticated,service_role;
create trigger sf01_document_scope_guard before update or delete on public.documents
for each row execute function private.sf01_document_scope_guard();

create or replace function private.sf01_revision_registration_guard() returns trigger
language plpgsql set search_path='' as $$
declare parent_scope record;
begin
 if tg_op='DELETE' then
  raise exception 'SF01-EVIDENCE: registered revision requires governed retention workflow';
 end if;
 select d.organization_id,d.project_id into parent_scope from public.documents d where d.id=new.document_id;
 if not found or parent_scope.project_id is null or new.organization_id is distinct from parent_scope.organization_id then
  raise exception 'SF01-EVIDENCE: revision parent scope is invalid';
 end if;
 if new.storage_path is null or split_part(new.storage_path,'/',1)<>new.organization_id::text or split_part(new.storage_path,'/',2)<>parent_scope.project_id::text or split_part(new.storage_path,'/',3)<>new.document_id::text or split_part(new.storage_path,'/',4)='' or split_part(new.storage_path,'/',5)<>'' or new.storage_path like '%//%' or new.storage_path ~ '(^|/)\.\.?(/|$)' then
  raise exception 'SF01-EVIDENCE: revision storage path must match document scope';
 end if;
 if new.content_hash is null or new.content_hash !~ '^[a-fA-F0-9]{64}$' or new.byte_size is null or new.byte_size<0 or new.byte_size>104857600 then
  raise exception 'SF01-EVIDENCE: valid SHA-256 and bounded size required';
 end if;
 if current_user='authenticated' and (auth.uid() is null or new.created_by is distinct from auth.uid()) then
  raise exception 'SF01-EVIDENCE: revision creator must match authenticated actor';
 end if;
 return new;
end $$;
revoke all on function private.sf01_revision_registration_guard() from public,anon,authenticated,service_role;
create trigger sf01_revision_registration_guard before insert or delete on public.document_versions
for each row execute function private.sf01_revision_registration_guard();

-- Keep authenticated evidence object writes append-only. Failed registrations leave
-- an unregistered upload for separately approved orphan cleanup, never direct SQL deletion.
create policy sf01_evidence_no_overwrite on storage.objects as restrictive for update to authenticated
using(bucket_id<>'contract-evidence') with check(bucket_id<>'contract-evidence');
create policy sf01_evidence_no_delete on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'contract-evidence');
