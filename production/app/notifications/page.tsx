import {AppShell} from "@/components/app-shell";
import {NotificationsClient} from "@/components/notifications-client";
import {getWorkspaceContext} from "@/lib/workspace";
export default async function Notifications(){
 const w=await getWorkspaceContext();const {data:items}=await w.supabase.from("notifications").select("id,kind,title,body,href,read_at,created_at").eq("organization_id",w.orgId).or("user_id.is.null,user_id.eq."+w.userId).order("created_at",{ascending:false}).limit(200);
 return <AppShell organizationName={w.organization?.name||"Workspace"}><div className="pageHead"><div><div className="eyebrow">Attention center</div><h1>Notifications</h1><div className="muted">Assignments, review requests and material workflow events that need your attention.</div></div></div><NotificationsClient initial={items||[]}/></AppShell>
}