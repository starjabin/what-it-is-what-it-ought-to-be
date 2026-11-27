-- STAGING CANDIDATE ONLY. Append-only application grants; owner/DB administrator can still alter history.
create table public.ai_security_events (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id),
 actor_id uuid not null references auth.users(id),
 request_id uuid not null,
 event_code text not null check(event_code in ('authorized','reserved','dispatch','blocked','completed','failed')),
 reason_code text not null check(reason_code in ('none','scope','firewall','policy','allowance','provider','persistence')),
 created_at timestamptz not null default now()
);
alter table public.ai_security_events enable row level security;
revoke all on public.ai_security_events from public,anon,authenticated,service_role;
grant insert on public.ai_security_events to service_role;
grant usage on sequence public.ai_security_events_id_seq to service_role;
create policy security_event_append on public.ai_security_events for insert to service_role with check (
 exists(select 1 from public.organization_members m where m.organization_id=ai_security_events.organization_id and m.user_id=ai_security_events.actor_id)
);
-- service_role on Supabase may bypass RLS; enforce membership in RPC too, and remove direct grant in real deployment.
revoke insert on public.ai_security_events from service_role;
create function public.append_ai_security_event(p_org uuid,p_actor uuid,p_request uuid,p_event text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.organization_members m where m.organization_id=p_org and m.user_id=p_actor) then raise exception 'Security event scope denied'; end if;
 insert into public.ai_security_events(organization_id,actor_id,request_id,event_code,reason_code) values(p_org,p_actor,p_request,p_event,p_reason);
end $$;
revoke all on function public.append_ai_security_event(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.append_ai_security_event(uuid,uuid,uuid,text,text) to service_role;
revoke usage on sequence public.ai_security_events_id_seq from service_role;
