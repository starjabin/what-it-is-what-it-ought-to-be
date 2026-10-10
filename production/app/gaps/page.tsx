import {AppShell} from "@/components/app-shell";
import {GapsClient} from "@/components/gaps-client";
import {getWorkspaceContext} from "@/lib/workspace";
export default async function GapsPage(){
 const w=await getWorkspaceContext();
 const [{data:gaps},{data:projects},{data:contracts},{data:evidence},{data:members}]=await Promise.all([
  w.supabase.from("gaps").select("id,project_id,contract_id,what_is,what_ought_to_be,why,gap,impact,action,owner_user_id,owner_label,deadline,status,severity,confidence,source_kind,created_at,reviewed_at").eq("organization_id",w.orgId).order("created_at",{ascending:false}),
  w.supabase.from("projects").select("id,code,name").eq("organization_id",w.orgId),
  w.supabase.from("contracts").select("id,project_id,contract_number,title").eq("organization_id",w.orgId),
  w.supabase.from("evidence").select("id,project_id,contract_id,document_id,source_locator,excerpt,evidence_kind,documents(file_name)").eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(500),
  w.supabase.from("organization_members").select("user_id,display_name,email,role").eq("organization_id",w.orgId)
 ]);
 return <AppShell organizationName={w.organization?.name||"Workspace"}>
  <div className="pageHead"><div><div className="eyebrow">Core intelligence</div><h1>Gap Register</h1><div className="muted">WHAT IT IS versus WHAT IT OUGHT TO BE, grounded in evidence and controlled by human review.</div></div></div>
  <GapsClient orgId={w.orgId} userId={w.userId} gaps={gaps||[]} projects={projects||[]} contracts={contracts||[]} evidence={evidence||[]} members={members||[]}/>
 </AppShell>
}