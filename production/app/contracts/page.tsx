import {LocalizedHeading} from "@/components/localized-heading";
import {AppShell} from "@/components/app-shell";
import {ContractsClient} from "@/components/contracts-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function ContractsPage(){
  const w=await getWorkspaceContext();
  const [{data:projects},{data:contracts}]=await Promise.all([
    w.supabase.from("projects").select("id,code,name").eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("contracts").select("id,project_id,contract_number,title,contract_type,employer,contractor,consultant,currency,contract_value,effective_date,commencement_date,completion_date,governing_law,status,created_at").eq("organization_id",w.orgId).order("created_at",{ascending:false})
  ]);
  return <AppShell localized organizationName={w.organization?.name||"Workspace"}>
    <LocalizedHeading eyebrow="Contract master" title="Contracts" description="The controlled contractual context behind documents, obligations, evidence, gaps and actions."/>
    <ContractsClient orgId={w.orgId} userId={w.userId} projects={projects||[]} contracts={contracts||[]}/>
  </AppShell>
}
