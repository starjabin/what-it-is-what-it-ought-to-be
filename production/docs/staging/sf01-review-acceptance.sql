begin;
insert into auth.users(id,email) values ('71000000-0000-4000-8000-000000000001','sf01-owner-a@example.invalid'),('71000000-0000-4000-8000-000000000002','sf01-admin-a@example.invalid'),('71000000-0000-4000-8000-000000000003','sf01-owner-b@example.invalid');
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
insert into public.organizations(id,name,created_by) values('72000000-0000-4000-8000-000000000001','SF01 synthetic A','71000000-0000-4000-8000-000000000001');
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}';
insert into public.organizations(id,name,created_by) values('72000000-0000-4000-8000-000000000002','SF01 synthetic B','71000000-0000-4000-8000-000000000003');
insert into public.organization_members(organization_id,user_id,role) values('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','admin');
insert into public.projects(id,organization_id,code,name) values('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','SF01A','Synthetic A'),('73000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','SF01B','Synthetic B');
set local role authenticated;
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
do $t$
declare n int;
begin
 insert into public.gaps(id,organization_id,project_id,what_is,what_ought_to_be,why,gap,impact,action,status,created_by) values('74000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','650 mm','800 mm','synthetic comparison','150 mm','hold','correct','Under Review',auth.uid());
 begin
  update public.gaps set status='Confirmed' where id='74000000-0000-4000-8000-000000000001';
  raise exception 'TEST FAILED: owner self-approved';
 exception when raise_exception then if sqlerrm not like 'SF01: independent reviewer%' then raise;end if;end;
 begin
  insert into public.gaps(organization_id,project_id,what_is,what_ought_to_be,why,gap,impact,action,status,created_by) values('72000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','650','800','test','150','hold','correct','Confirmed',auth.uid());
  raise exception 'TEST FAILED: preconfirmed insert';
 exception when raise_exception then if sqlerrm not like 'SF01: insert must%' then raise;end if;end;
 begin
  update public.gaps set created_by='71000000-0000-4000-8000-000000000002' where id='74000000-0000-4000-8000-000000000001';
  raise exception 'TEST FAILED: attribution rewrite';
 exception when raise_exception then if sqlerrm not like 'SF01: candidate creator and scope%' then raise;end if;end;
 begin
  update public.gaps set reviewed_by='71000000-0000-4000-8000-000000000002' where id='74000000-0000-4000-8000-000000000001';
  raise exception 'TEST FAILED: review attribution rewrite';
 exception when raise_exception then if sqlerrm not like 'SF01: review attribution%' then raise;end if;end;
end $t$;
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}';
do $t$ begin
 if exists(select 1 from public.gaps where id='74000000-0000-4000-8000-000000000001') then raise exception 'TEST FAILED: tenant B sees A gap';end if;
 update public.gaps set status='Confirmed' where id='74000000-0000-4000-8000-000000000001';
 if found then raise exception 'TEST FAILED: tenant B modifies A gap';end if;
end $t$;
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}';
do $t$ begin if exists(select 1 from public.gaps) then raise exception 'TEST FAILED: AAL1 sees gap';end if; end $t$;
set local request.jwt.claims='{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}';
do $t$ begin
 update public.gaps set status='Confirmed' where id='74000000-0000-4000-8000-000000000001';
 if not found or not exists(select 1 from public.gaps where id='74000000-0000-4000-8000-000000000001' and status='Confirmed' and reviewed_by=auth.uid() and reviewed_at is not null) then raise exception 'TEST FAILED: independent confirmation';end if;
 if (select count(*) from public.gap_history where gap_id='74000000-0000-4000-8000-000000000001')<>2 then raise exception 'TEST FAILED: atomic history';end if;
end $t$;
reset role;
rollback;
select 'PASS: 9 assertions; transaction rolled back; simulated JWT claims, not live login' result,(select count(*) from auth.users) remaining_auth_users,(select count(*) from public.gaps) remaining_gaps,(select count(*) from public.organizations) remaining_organizations;