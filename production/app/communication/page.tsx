import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";
import {CommunicationClient} from "@/components/communication-client";

export default async function CommunicationPage(){
  const w=await getWorkspaceContext();

  const [
    {data:channels},
    {data:messages},
    {data:members},
    {data:projects},
    {data:contracts},
    {data:documents},
    {data:workItems},
    {data:workEvents}
  ]=await Promise.all([
    w.supabase.from("channels")
      .select("id,name,description,project_id,created_at")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("messages")
      .select("id,channel_id,sender_user_id,body,created_at,project_id,contract_id,document_id,work_item_id,recipient_user_id,message_type")
      .eq("organization_id",w.orgId).is("deleted_at",null).order("created_at",{ascending:true}).limit(500),
    w.supabase.from("organization_members")
      .select("user_id,display_name,email,job_title,role")
      .eq("organization_id",w.orgId),
    w.supabase.from("projects")
      .select("id,name,code,status")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("contracts")
      .select("id,project_id,contract_number,title,status")
      .eq("organization_id",w.orgId).order("created_at"),
    w.supabase.from("documents")
      .select("id,project_id,contract_id,file_name,document_type,processing_status")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(500),
    w.supabase.from("work_items")
      .select("id,project_id,contract_id,document_id,source_message_id,parent_work_item_id,title,details,priority,assigned_to,assigned_by,due_at,status,accepted_at,completed_at,forwarded_at,last_overdue_alert_at,overdue_alert_count,created_at,updated_at")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(500),
    w.supabase.from("work_item_events")
      .select("id,work_item_id,actor_user_id,event_type,note,from_user_id,to_user_id,created_at")
      .eq("organization_id",w.orgId).order("created_at",{ascending:false}).limit(1000)
  ]);

  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead">
      <div>
        <div className="eyebrow">Contextual coordination</div>
        <h1>Messaging Center</h1>
        <div className="muted">Discuss work in project/contract/document context, assign it, forward it, and let the system escalate overdue ownership.</div>
      </div>
    </div>
    <CommunicationClient
      orgId={w.orgId}
      userId={w.userId}
      channels={channels||[]}
      messages={messages||[]}
      members={members||[]}
      projects={projects||[]}
      contracts={contracts||[]}
      documents={documents||[]}
      workItems={workItems||[]}
      workEvents={workEvents||[]}
    />
  </AppShell>
}
