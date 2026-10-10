create or replace function private.storage_org_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
    else null
  end
$$;

revoke all on function private.storage_org_id(text) from public;
grant execute on function private.storage_org_id(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'contract-evidence',
  'contract-evidence',
  false,
  104857600,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv',
    'message/rfc822',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy "contract evidence select"
on storage.objects for select to authenticated
using (
  bucket_id='contract-evidence'
  and private.is_org_member(private.storage_org_id(name))
);

create policy "contract evidence insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='contract-evidence'
  and private.is_org_member(private.storage_org_id(name))
);

create policy "contract evidence update"
on storage.objects for update to authenticated
using (
  bucket_id='contract-evidence'
  and private.is_org_member(private.storage_org_id(name))
)
with check (
  bucket_id='contract-evidence'
  and private.is_org_member(private.storage_org_id(name))
);

create policy "contract evidence delete"
on storage.objects for delete to authenticated
using (
  bucket_id='contract-evidence'
  and private.is_org_member(private.storage_org_id(name))
);
