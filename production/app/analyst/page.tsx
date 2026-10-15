import {AppShell} from "@/components/app-shell";
import {AnalystClient} from "@/components/analyst-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function Analyst(){
  const w=await getWorkspaceContext();

  const [
    {data:contracts},
    {data:documents},
    {data:versions},
    {data:evidence},
    {data:obligations},
    {data:gaps}
  ]=await Promise.all([
    w.supabase.from("contracts")
      .select("id,project_id,contract_number,title,contract_type,status,currency,contract_value")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("documents")
      .select("id,contract_id,file_name,document_type,processing_status,current_version_id")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}),
    w.supabase.from("document_versions")
      .select("id,document_id,file_name,version_no,processing_status,processing_error,extracted_at,is_current")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}),
    w.supabase.from("evidence")
      .select("id,contract_id,document_id,document_version_id,source_type,source_locator,excerpt,evidence_kind")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(1000),
    w.supabase.from("obligations")
      .select("id,contract_id,document_version_id,obligation_type,responsible_party,beneficiary_party,obligation_text,timing_requirement,source_locator,status,confidence")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(1000),
    w.supabase.from("gaps")
      .select("id,contract_id,gap,status,severity,confidence,source_kind,ai_run_id,created_at")
      .eq("organization_id",w.orgId).eq("source_kind","ai").order("created_at",{ascending:false}).limit(100)
  ]);

  const scopes=(contracts||[]).map(contract=>{
    const contractDocs=(documents||[]).filter(d=>d.contract_id===contract.id);
    const docIds=new Set(contractDocs.map(d=>d.id));
    const contractVersions=(versions||[]).filter(v=>docIds.has(v.document_id));
    const readyVersions=contractVersions.filter(v=>v.processing_status==="ready");
    const readyVersionIds=new Set(readyVersions.map(v=>v.id));
    const reviewedEvidence=(evidence||[]).filter(e=>e.contract_id===contract.id&&readyVersionIds.has(e.document_version_id));
    const reviewedObligations=(obligations||[]).filter(o=>o.contract_id===contract.id&&readyVersionIds.has(o.document_version_id));
    const candidates=(gaps||[]).filter(g=>g.contract_id===contract.id).slice(0,8);

    return {
      id:contract.id,
      project_id:contract.project_id,
      contract_number:contract.contract_number,
      title:contract.title,
      contract_type:contract.contract_type,
      status:contract.status,
      currency:contract.currency,
      contract_value:contract.contract_value,
      documents:contractDocs,
      versions:contractVersions,
      ready_versions:readyVersions.length,
      failed_versions:contractVersions.filter(v=>v.processing_status==="failed").length,
      needs_review_versions:contractVersions.filter(v=>v.processing_status==="needs review").length,
      evidence:reviewedEvidence.slice(0,80),
      obligations:reviewedObligations.slice(0,80),
      candidates
    };
  });

  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead analystPageHead">
      <div>
        <div className="eyebrow">Grounded intelligence</div>
        <h1>AI Analyst</h1>
        <div className="muted">Generate proposed Gap records from reviewed, cited evidence and extracted contractual obligations—not free-form contract prose.</div>
      </div>
      <div className="analystPolicyBadge"><span>✓</span><div><b>Evidence-gated</b><small>Human review required</small></div></div>
    </div>
    <AnalystClient scopes={scopes}/>
  </AppShell>
}
