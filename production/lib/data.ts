import {redirect} from "next/navigation";
import {demo,type WorkspaceSnapshot} from "@/lib/demo";
import {createClient,isSupabaseConfigured} from "@/lib/supabase/server";

export async function getWorkspaceSnapshot():Promise<WorkspaceSnapshot>{
  if(!isSupabaseConfigured())return {...demo,mode:"demo"};
  const supabase=await createClient();
  if(!supabase)return {...demo,mode:"demo"};

  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims)redirect("/sign-in");

  const userId=String(claims.claims.sub);
  const {data:membership}=await supabase.from("organization_members")
    .select("organization_id, role, organizations(name, market, currency)")
    .eq("user_id",userId).limit(1).maybeSingle();

  if(!membership?.organization_id)redirect("/onboarding");
  const orgId=membership.organization_id;

  const [pr,gr,ar,dr]=await Promise.all([
    supabase.from("projects").select("id, code, name, market, status").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(50),
    supabase.from("gaps").select("id, severity, status, gap, impact, owner_label, deadline, projects(name)").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100),
    supabase.from("actions").select("id, gap_id, action_text, owner_label, due_at, status").eq("organization_id",orgId).order("due_at",{ascending:true}).limit(100),
    supabase.from("documents").select("id",{count:"exact",head:true}).eq("organization_id",orgId)
  ]);

  const org=membership.organizations as unknown as {name:string;market:string;currency:string}|null;
  return {
    organization:org??demo.organization,
    projects:(pr.data??[]).map((p:any)=>({id:p.id,code:p.code,name:p.name,market:p.market,status:p.status})),
    gaps:(gr.data??[]).map((g:any)=>({id:g.id,severity:g.severity,status:g.status,project:g.projects?.name??"Project",gap:g.gap,impact:g.impact,owner:g.owner_label??"Unassigned",deadline:g.deadline??"—"})),
    actions:(ar.data??[]).map((a:any)=>({id:a.id,gap:a.gap_id,text:a.action_text,owner:a.owner_label??"Unassigned",due:a.due_at??"—",status:a.status})),
    documents:dr.count??0,
    mode:"live"
  };
}
