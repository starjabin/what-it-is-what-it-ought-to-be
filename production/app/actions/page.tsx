import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function Actions(){
  const w=await getWorkspaceContext();
  const [{data:actions},{data:members},{data:workItems}]=await Promise.all([
    w.supabase.from("actions")
      .select("id,gap_id,action_text,owner_user_id,owner_label,due_at,status,completion_evidence,created_at")
      .eq("organization_id",w.orgId).order("due_at",{ascending:true}),
    w.supabase.from("organization_members")
      .select("user_id,display_name,email").eq("organization_id",w.orgId),
    w.supabase.from("work_items")
      .select("id,action_id,assigned_to,due_at,status,overdue_alert_count")
      .eq("organization_id",w.orgId).not("action_id","is",null)
  ]);

  const names=Object.fromEntries((members||[]).map(m=>[m.user_id,m.display_name||m.email||"Team member"]));
  const workByAction=Object.fromEntries((workItems||[]).map(wi=>[wi.action_id,wi]));

  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead">
      <div>
        <div className="eyebrow">Contractual action register</div>
        <h1>Gap Actions</h1>
        <div className="muted">Each action is saved once against its Gap. Execution ownership, forwarding, status and overdue alerts run through Messaging Center.</div>
      </div>
      <Link className="btn primary" href="/communication">Open execution queue →</Link>
    </div>

    <div className="card">
      <div className="tableWrap">
        <table>
          <thead><tr><th>Action</th><th>Source Gap</th><th>Owner</th><th>Deadline</th><th>Action status</th><th>Execution</th><th>Completion evidence</th></tr></thead>
          <tbody>{(actions||[]).map(a=>{
            const work=workByAction[a.id];
            return <tr key={a.id}>
              <td><b>{a.action_text}</b></td>
              <td>{a.gap_id?<Link href={"/gaps/"+a.gap_id}>Open Gap</Link>:"—"}</td>
              <td>{a.owner_user_id?names[a.owner_user_id]:a.owner_label||"Unassigned"}</td>
              <td>{a.due_at||"—"}</td>
              <td><span className="badge neutral">{a.status}</span></td>
              <td>{work?<Link href={"/communication?work="+work.id}><span className={"badge "+(work.status==="Completed"?"good":"neutral")}>{work.status}</span>{work.overdue_alert_count>0?" · "+work.overdue_alert_count+" alert(s)":""}</Link>:<span className="muted">Not assigned</span>}</td>
              <td>{a.completion_evidence||"—"}</td>
            </tr>
          })}</tbody>
        </table>
      </div>
    </div>
  </AppShell>
}
