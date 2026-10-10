import {AppShell} from "@/components/app-shell";
import {ProjectsClient} from "@/components/projects-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function ProjectsPage(){
  const w=await getWorkspaceContext();
  const {data:projects}=await w.supabase.from("projects")
    .select("id,code,name,market,status,created_at").eq("organization_id",w.orgId).order("created_at",{ascending:false});
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead"><div><div className="eyebrow">Portfolio</div><h1>Projects</h1><div className="muted">Project context is the boundary for contracts, evidence, obligations, gaps and actions.</div></div></div>
    <ProjectsClient orgId={w.orgId} userId={w.userId} projects={projects||[]} defaultMarket={w.organization?.market||"Global / International"}/>
  </AppShell>
}