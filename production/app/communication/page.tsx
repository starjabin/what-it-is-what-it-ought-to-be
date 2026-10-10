import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";
import {CommunicationClient} from "@/components/communication-client";

export default async function CommunicationPage(){
 const w=await getWorkspaceContext();
 const [{data:channels},{data:messages},{data:members},{data:projects}]=await Promise.all([
  w.supabase.from("channels").select("id,name,description,project_id,created_at").eq("organization_id",w.orgId).order("created_at"),
  w.supabase.from("messages").select("id,channel_id,sender_user_id,body,created_at").eq("organization_id",w.orgId).is("deleted_at",null).order("created_at",{ascending:true}).limit(300),
  w.supabase.from("organization_members").select("user_id,display_name,email,job_title").eq("organization_id",w.orgId),
  w.supabase.from("projects").select("id,name,code").eq("organization_id",w.orgId)
 ]);
 return <AppShell organizationName={w.organization?.name||"Workspace"}><div className="pageHead"><div><div className="eyebrow">Team communication</div><h1>Communication</h1><div className="muted">Project discussion stays inside the same governed workspace as documents, gaps and actions.</div></div></div><CommunicationClient orgId={w.orgId} userId={w.userId} channels={channels||[]} messages={messages||[]} members={members||[]} projects={projects||[]}/></AppShell>
}
