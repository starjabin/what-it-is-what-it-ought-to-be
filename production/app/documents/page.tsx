import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";
import {DocumentsClient} from "@/components/documents-client";

export default async function DocumentsPage(){
 const w=await getWorkspaceContext();
 const [{data:docs},{data:projects},{data:members},{data:assignments}]=await Promise.all([
  w.supabase.from("documents").select("id,file_name,document_type,storage_path,version_no,project_id,created_at,uploaded_by").eq("organization_id",w.orgId).order("created_at",{ascending:false}),
  w.supabase.from("projects").select("id,name,code").eq("organization_id",w.orgId).order("created_at"),
  w.supabase.from("organization_members").select("user_id,display_name,email,job_title").eq("organization_id",w.orgId),
  w.supabase.from("document_assignments").select("id,document_id,assignee_user_id,assignee_label,instruction,priority,due_at,status,created_at").eq("organization_id",w.orgId).order("created_at",{ascending:false})
 ]);
 return <AppShell organizationName={w.organization?.name||"Workspace"}><div className="pageHead"><div><div className="eyebrow">Evidence & document control</div><h1>Documents</h1><div className="muted">Upload private project records, assign them for review or action, and preserve a traceable chain of responsibility.</div></div></div><DocumentsClient orgId={w.orgId} userId={w.userId} documents={docs||[]} projects={projects||[]} members={members||[]} assignments={assignments||[]}/></AppShell>
}
