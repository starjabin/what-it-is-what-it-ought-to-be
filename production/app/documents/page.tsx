import {AppShell} from "@/components/app-shell";
import {DocumentsCoreClient} from "@/components/documents-core-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function DocumentsPage(){
  const w=await getWorkspaceContext();
  const [{data:docs},{data:projects},{data:contracts},{data:versions},{data:assignments},{data:members}]=await Promise.all([
    w.supabase.from("documents").select("id,project_id,contract_id,file_name,document_type,storage_path,content_hash,version_no,current_version_id,processing_status,created_at").eq("organization_id",w.orgId).order("created_at",{ascending:false}),
    w.supabase.from("projects").select("id,code,name").eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("contracts").select("id,project_id,contract_number,title").eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("document_versions").select("id,document_id,version_no,file_name,storage_path,content_hash,mime_type,byte_size,processing_status,processing_error,is_current,created_at,extracted_at").eq("organization_id",w.orgId).order("version_no",{ascending:false}),
    w.supabase.from("work_items").select("id,document_id,project_id,contract_id,title,details,priority,assigned_to,assigned_by,due_at,status,created_at,client_request_id").eq("organization_id",w.orgId).not("document_id","is",null).order("created_at",{ascending:false}),
    w.supabase.from("organization_members").select("user_id,display_name,email").eq("organization_id",w.orgId)
  ]);
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead"><div><div className="eyebrow">Controlled source</div><h1>Documents</h1><div className="muted">Contract-linked, immutable revisions with processing state and one canonical accountable work queue.</div></div></div>
    <DocumentsCoreClient orgId={w.orgId} userId={w.userId} documents={docs||[]} versions={versions||[]} projects={projects||[]} contracts={contracts||[]} assignments={assignments||[]} members={members||[]}/>
  </AppShell>
}