import {AppShell} from "@/components/app-shell";
import {AISettingsClient} from "@/components/ai-settings-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function AIConfiguration(){
  const w=await getWorkspaceContext();
  const [{data:settings},{count:runs}]=await Promise.all([
    w.supabase.from("ai_settings").select("*").eq("organization_id",w.orgId).maybeSingle(),
    w.supabase.from("ai_runs").select("id",{count:"exact",head:true}).eq("organization_id",w.orgId).gte("created_at",new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString())
  ]);

  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <AISettingsClient orgId={w.orgId} role={w.role} initial={settings} monthlyRuns={runs||0}/>
  </AppShell>
}
