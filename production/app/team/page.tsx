import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";
import {TeamClient} from "@/components/team-client";

export default async function TeamPage(){
  const w=await getWorkspaceContext();
  const [{data:members},{data:invites}]=await Promise.all([
    w.supabase.from("organization_members").select("user_id,role,display_name,email,job_title,created_at").eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("team_invitations").select("id,email,role,job_title,status,expires_at,created_at,token").eq("organization_id",w.orgId).order("created_at",{ascending:false})
  ]);
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead"><div><div className="eyebrow">People & accountability</div><h1>Team</h1><div className="muted">Invite the people who review evidence, make decisions and own actions.</div></div></div>
    <TeamClient orgId={w.orgId} currentUserId={w.userId} role={w.role} members={members||[]} invitations={invites||[]}/>
  </AppShell>
}
