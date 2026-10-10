import {notFound} from "next/navigation";
import {AppShell} from "@/components/app-shell";
import {GapReviewClient} from "@/components/gap-review-client";
import {getWorkspaceContext} from "@/lib/workspace";
export default async function GapDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params,w=await getWorkspaceContext();
 const {data:gap}=await w.supabase.from("gaps").select("*").eq("organization_id",w.orgId).eq("id",id).maybeSingle();if(!gap)notFound();
 const [{data:links},{data:history},{data:members},{data:actions}]=await Promise.all([
  w.supabase.from("gap_evidence").select("evidence_id,locator,evidence_kind,note,documents(file_name)").eq("gap_id",id),
  w.supabase.from("gap_history").select("id,event,snapshot,actor_user_id,created_at").eq("gap_id",id).order("created_at",{ascending:false}),
  w.supabase.from("organization_members").select("user_id,display_name,email,role").eq("organization_id",w.orgId),
  w.supabase.from("actions").select("id,action_text,owner_user_id,owner_label,due_at,status,completion_evidence,created_at").eq("organization_id",w.orgId).eq("gap_id",id).order("created_at",{ascending:false})
 ]);
 const evidenceIds=(links||[]).map((l:any)=>l.evidence_id).filter(Boolean);
 const {data:evidence}=evidenceIds.length?await w.supabase.from("evidence").select("id,source_locator,excerpt,evidence_kind,documents(file_name)").in("id",evidenceIds):{data:[]};
 return <AppShell organizationName={w.organization?.name||"Workspace"}><GapReviewClient gap={gap} evidence={evidence||[]} links={links||[]} history={history||[]} members={members||[]} actions={actions||[]} userId={w.userId}/></AppShell>
}