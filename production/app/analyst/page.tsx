import {AppShell} from "@/components/app-shell";
import {AnalystClient} from "@/components/analyst-client";
import {getWorkspaceSnapshot} from "@/lib/data";

export default async function Analyst(){
  const data=await getWorkspaceSnapshot();
  return <AppShell mode={data.mode}>
    <div className="pageHead">
      <div><div className="eyebrow">Grounded intelligence</div><h1>AI Analyst</h1><div className="muted">Convert evidence into a structured Gap proposal without giving the model authority to approve the finding.</div></div>
    </div>
    <AnalystClient/>
  </AppShell>
}
