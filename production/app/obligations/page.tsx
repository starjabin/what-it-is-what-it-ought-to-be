import {AppShell} from "@/components/app-shell";
import {ObligationsClient} from "@/components/obligations-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function ObligationsPage(){
  const w=await getWorkspaceContext();
  const [{data:contracts},{data:versions},{data:clauses},{data:definitions},{data:obligations}]=await Promise.all([
    w.supabase.from("contracts").select("id,title,contract_number").eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("document_versions").select("id,document_id,file_name,version_no,processing_status,extracted_at").eq("organization_id",w.orgId).order("created_at",{ascending:false}),
    w.supabase.from("clauses").select("id,contract_id,document_version_id,clause_number,heading,clause_text,source_locator,confidence").eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("definitions").select("id,contract_id,document_version_id,term,definition_text,source_locator,confidence").eq("organization_id",w.orgId).order("term"),
    w.supabase.from("obligations").select("id,contract_id,document_version_id,clause_id,obligation_type,responsible_party,beneficiary_party,obligation_text,trigger_condition,timing_requirement,consequence,source_locator,status,confidence").eq("organization_id",w.orgId).order("created_at")
  ]);
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead"><div><div className="eyebrow">Contract structure</div><h1>Clauses & Obligations</h1><div className="muted">Review the extracted OUGHT before it is relied on by the Gap Engine.</div></div></div>
    <ObligationsClient contracts={contracts||[]} versions={versions||[]} clauses={clauses||[]} definitions={definitions||[]} obligations={obligations||[]}/>
  </AppShell>
}
