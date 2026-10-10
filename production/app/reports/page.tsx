import {AppShell} from "@/components/app-shell";
import {ReportsClient} from "@/components/reports-client";
import {getWorkspaceContext} from "@/lib/workspace";
export default async function ReportsPage(){
 const w=await getWorkspaceContext();
 const [{data:contracts},{data:gaps},{data:actions},{data:obligations},{data:evidence},{data:snapshots}]=await Promise.all([
  w.supabase.from("contracts").select("id,title,contract_number,project_id").eq("organization_id",w.orgId),
  w.supabase.from("gaps").select("id,contract_id,severity,status,gap,impact,action,owner_label,deadline,confidence").eq("organization_id",w.orgId).order("created_at"),
  w.supabase.from("actions").select("id,gap_id,action_text,owner_label,due_at,status,completion_evidence").eq("organization_id",w.orgId).order("due_at"),
  w.supabase.from("obligations").select("id,contract_id,responsible_party,obligation_text,timing_requirement,source_locator,status,confidence").eq("organization_id",w.orgId).order("created_at"),
  w.supabase.from("evidence").select("id,contract_id,source_locator,evidence_kind").eq("organization_id",w.orgId),
  w.supabase.from("report_snapshots").select("id,report_type,contract_id,created_at").eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(50)
 ]);
 return <AppShell organizationName={w.organization?.name||"Workspace"}><div className="pageHead"><div><div className="eyebrow">Management output</div><h1>Reports</h1><div className="muted">Snapshot evidence, gaps, obligations and accountable actions into management-ready outputs.</div></div></div><ReportsClient orgId={w.orgId} userId={w.userId} organization={w.organization?.name||"Organization"} contracts={contracts||[]} gaps={gaps||[]} actions={actions||[]} obligations={obligations||[]} evidence={evidence||[]} snapshots={snapshots||[]}/></AppShell>
}