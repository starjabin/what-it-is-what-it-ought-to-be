import {AppShell} from "@/components/app-shell";
import {AnalystClient} from "@/components/analyst-client";
import {getWorkspaceContext} from "@/lib/workspace";
export default async function Analyst(){
 const w=await getWorkspaceContext();
 const [{data:contracts},{data:evidence},{data:obligations}]=await Promise.all([
  w.supabase.from("contracts").select("id,contract_number,title").eq("organization_id",w.orgId).order("created_at"),
  w.supabase.from("evidence").select("id,contract_id").eq("organization_id",w.orgId),
  w.supabase.from("obligations").select("id,contract_id").eq("organization_id",w.orgId)
 ]);
 const counts=Object.fromEntries((contracts||[]).map(c=>[c.id,{evidence:(evidence||[]).filter(e=>e.contract_id===c.id).length,obligations:(obligations||[]).filter(o=>o.contract_id===c.id).length}]));
 return <AppShell organizationName={w.organization?.name||"Workspace"}><div className="pageHead"><div><div className="eyebrow">Grounded intelligence</div><h1>AI Analyst</h1><div className="muted">Generate proposed Gap records from stored, cited evidence—not free-form contract prose.</div></div></div><AnalystClient contracts={contracts||[]} counts={counts}/></AppShell>
}