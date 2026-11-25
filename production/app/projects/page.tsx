import {LocalizedHeading} from "@/components/localized-heading";
import {AppShell} from "@/components/app-shell";
import {ProjectsClient} from "@/components/projects-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function ProjectsPage(){
  const w=await getWorkspaceContext();
  const {data:projects}=await w.supabase.from("projects")
    .select("id,code,name,market,status,created_at").eq("organization_id",w.orgId).order("created_at",{ascending:false});
  return <AppShell localized organizationName={w.organization?.name||"Workspace"}>
    <LocalizedHeading eyebrow="Portfolio" title="Projects" description="Project context is the boundary for contracts, evidence, obligations, gaps and actions."/>
    <ProjectsClient orgId={w.orgId} userId={w.userId} projects={projects||[]} defaultMarket={w.organization?.market||"Global / International"}/>
  </AppShell>
}