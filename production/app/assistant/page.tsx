
import {AppShell} from "@/components/app-shell";
import {InternalAssistantClient} from "@/components/internal-assistant-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function InternalAssistantPage(){
  const w=await getWorkspaceContext();
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <InternalAssistantClient/>
  </AppShell>
}
