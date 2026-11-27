begin;
insert into auth.users(id,email) values('81000000-0000-4000-8000-000000000001','sf01-evidence@example.invalid');
set local request.jwt.claims='{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
insert into public.organizations(id,name,created_by) values('82000000-0000-4000-8000-000000000001','Synthetic evidence','81000000-0000-4000-8000-000000000001');
insert into public.projects(id,organization_id,code,name) values('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','E1','Evidence project'),('83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','E2','Other project');
set local role authenticated;
do $t$
declare o uuid:='82000000-0000-4000-8000-000000000001'; p uuid:='83000000-0000-4000-8000-000000000001'; d uuid:='84000000-0000-4000-8000-000000000001'; v uuid:='85000000-0000-4000-8000-000000000001'; path text:=o||'/'||p||'/'||d||'/v1-test.txt'; h text:=repeat('a',64);
begin
 insert into public.documents(id,organization_id,project_id,file_name,storage_path,uploaded_by) values(d,o,p,'test.txt',path,auth.uid());
 insert into public.document_versions(id,organization_id,document_id,version_no,file_name,storage_path,content_hash,byte_size,created_by) values(v,o,d,1,'test.txt',path,h,3,auth.uid());
 if not exists(select 1 from public.documents where id=d and current_version_id=v) then raise exception 'TEST FAILED: valid revision';end if;
 begin update public.documents set project_id='83000000-0000-4000-8000-000000000002' where id=d;raise exception 'TEST FAILED: scope relocation';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: document scope%' then raise;end if;end;
 begin insert into public.document_versions(organization_id,document_id,version_no,file_name,storage_path,content_hash,byte_size,created_by,is_current) values(o,d,2,'bad.txt',o||'/83000000-0000-4000-8000-000000000002/'||d||'/bad.txt',h,3,auth.uid(),false);raise exception 'TEST FAILED: wrong path';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: revision storage path%' then raise;end if;end;
 begin insert into public.document_versions(organization_id,document_id,version_no,file_name,storage_path,content_hash,byte_size,created_by,is_current) values(o,d,2,'bad.txt',o||'/'||p||'/'||d||'/bad.txt','bad',3,auth.uid(),false);raise exception 'TEST FAILED: invalid hash';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: valid SHA-256%' then raise;end if;end;
 begin insert into public.document_versions(organization_id,document_id,version_no,file_name,storage_path,content_hash,byte_size,created_by,is_current) values(o,d,2,'bad.txt',o||'/'||p||'/'||d||'/bad.txt',h,104857601,auth.uid(),false);raise exception 'TEST FAILED: invalid size';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: valid SHA-256%' then raise;end if;end;
 begin insert into public.document_versions(organization_id,document_id,version_no,file_name,storage_path,content_hash,byte_size,created_by,is_current) values(o,d,2,'bad.txt',o||'/'||p||'/'||d||'/bad.txt',h,3,null,false);raise exception 'TEST FAILED: forged creator';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: revision creator%' then raise;end if;end;
 begin update public.document_versions set content_hash=repeat('b',64) where id=v;raise exception 'TEST FAILED: changed hash';exception when raise_exception then if sqlerrm not like 'document revision source fields are immutable%' then raise;end if;end;
end $t$;
reset role;
do $t$ begin
 begin delete from public.document_versions where id='85000000-0000-4000-8000-000000000001';raise exception 'TEST FAILED: revision deletion';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: registered revision%' then raise;end if;end;
 begin delete from public.documents where id='84000000-0000-4000-8000-000000000001';raise exception 'TEST FAILED: parent deletion';exception when raise_exception then if sqlerrm not like 'SF01-EVIDENCE: registered document%' then raise;end if;end;
 if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and permissive='RESTRICTIVE' and policyname in ('sf01_evidence_no_overwrite','sf01_evidence_no_delete'))<>2 then raise exception 'TEST FAILED: storage policies missing';end if;
end $t$;
rollback;
select 'PASS: 10 metadata assertions; storage policies present, no object bytes tested' result,(select count(*) from auth.users) remaining_users,(select count(*) from public.documents) remaining_documents,(select count(*) from public.document_versions) remaining_revisions;