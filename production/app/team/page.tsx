import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";
import {TeamClient} from "@/components/team-client";

export default async function TeamPage(){
  const w=await getWorkspaceContext();

  const [
    {data:members},
    {data:invites},
    {data:projects},
    {data:contracts},
    {data:projectTeam},
    {data:contractTeam},
    {data:workItems}
  ]=await Promise.all([
    w.supabase.from("organization_members")
      .select("user_id,role,display_name,email,job_title,created_at")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("team_invitations")
      .select("id,email,role,job_title,status,expires_at,created_at,token")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}),
    w.supabase.from("projects")
      .select("id,code,name,status")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("contracts")
      .select("id,project_id,contract_number,title,status")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("project_team_members")
      .select("project_id,user_id,team_role,created_at")
      .eq("organization_id",w.orgId),
    w.supabase.from("contract_team_members")
      .select("contract_id,user_id,team_role,created_at")
      .eq("organization_id",w.orgId),
    w.supabase.from("work_items")
      .select("id,assigned_to,status,due_at,priority")
      .eq("organization_id",w.orgId)
  ]);

  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead">
      <div>
        <div className="eyebrow">People, contracts & accountability</div>
        <h1>Teams</h1>
        <div className="muted">Organize people around projects and contracts, then track the work they own and what is already overdue.</div>
      </div>
    </div>
    <TeamClient
      orgId={w.orgId}
      currentUserId={w.userId}
      role={w.role}
      members={members||[]}
      invitations={invites||[]}
      projects={projects||[]}
      contracts={contracts||[]}
      projectTeam={projectTeam||[]}
      contractTeam={contractTeam||[]}
      workItems={workItems||[]}
    />
  </AppShell>
}
