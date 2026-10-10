import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function EvidencePage(){
  const w=await getWorkspaceContext();
  const {data:evidence}=await w.supabase.from("evidence")
    .select("id,source_type,source_locator,excerpt,evidence_kind,created_at,documents(file_name),contracts(title),obligations(obligation_text)")
    .eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(500);
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead"><div><div className="eyebrow">Traceable source</div><h1>Evidence</h1><div className="muted">Every material finding should resolve back to a source record and precise locator.</div></div></div>
    <div className="card"><div className="tableWrap"><table><thead><tr><th>Source</th><th>Locator</th><th>Evidence</th><th>Kind</th></tr></thead><tbody>{(evidence||[]).map((e:any)=><tr key={e.id}><td><b>{e.documents?.file_name||e.source_type}</b><div className="meta">{e.contracts?.title||""}</div></td><td><code>{e.source_locator}</code></td><td><div className="evidenceExcerpt">{e.excerpt||e.obligations?.obligation_text||"—"}</div></td><td><span className="badge neutral">{e.evidence_kind}</span></td></tr>)}</tbody></table></div>{!evidence?.length&&<div className="emptyState">Evidence records appear after a contract is processed or a reviewer links project records.</div>}</div>
  </AppShell>
}
