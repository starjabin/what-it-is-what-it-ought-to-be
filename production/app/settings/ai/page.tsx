import {AppShell} from "@/components/app-shell";
import {AISettingsClient} from "@/components/ai-settings-client";
import {getWorkspaceContext} from "@/lib/workspace";
export default async function AIConfiguration(){
 const w=await getWorkspaceContext();
 const {data:settings}=await w.supabase.from("ai_settings").select("*").eq("organization_id",w.orgId).maybeSingle();
 const {count:runs}=await w.supabase.from("ai_runs").select("id",{count:"exact",head:true}).eq("organization_id",w.orgId).gte("created_at",new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString());
 return <AppShell organizationName={w.organization?.name||"Workspace"}><div className="pageHead"><div><div className="eyebrow">Tenant controls</div><h1>AI Configuration</h1><div className="muted">Provider, model routing, subscription budget and guardrails. Provider credentials remain in the server vault and are never shown in the browser.</div></div></div><AISettingsClient orgId={w.orgId} role={w.role} initial={settings} monthlyRuns={runs||0}/></AppShell>
}