import Link from "next/link";
import {AppShell} from "@/components/app-shell";
import {getWorkspaceContext} from "@/lib/workspace";

const terminalWork=new Set(["Completed","Closed","Cancelled"]);
const terminalGap=new Set(["Resolved","Closed","Rejected","Not Applicable"]);

export default async function FlowStudio(){
  const w=await getWorkspaceContext();

  const [
    {data:projects},
    {data:contracts},
    {data:documents},
    {data:versions},
    {data:evidence},
    {data:obligations},
    {data:gaps},
    {data:actions},
    {data:workItems}
  ]=await Promise.all([
    w.supabase.from("projects").select("id,code,name").eq("organization_id",w.orgId),
    w.supabase.from("contracts").select("id,project_id,contract_number,title").eq("organization_id",w.orgId),
    w.supabase.from("documents").select("id,contract_id,processing_status").eq("organization_id",w.orgId),
    w.supabase.from("document_versions").select("id,document_id,processing_status").eq("organization_id",w.orgId),
    w.supabase.from("evidence").select("id,contract_id").eq("organization_id",w.orgId),
    w.supabase.from("obligations").select("id,contract_id,status").eq("organization_id",w.orgId),
    w.supabase.from("gaps").select("id,status,severity,source_kind").eq("organization_id",w.orgId),
    w.supabase.from("actions").select("id,gap_id,status").eq("organization_id",w.orgId),
    w.supabase.from("work_items").select("id,status,due_at,action_id,document_id").eq("organization_id",w.orgId)
  ]);

  const projectCount=projects?.length||0;
  const contractCount=contracts?.length||0;
  const docCount=documents?.length||0;
  const needsReview=(versions||[]).filter(v=>v.processing_status==="needs review").length;
  const ready=(versions||[]).filter(v=>v.processing_status==="ready").length;
  const evidenceCount=evidence?.length||0;
  const obligationCount=obligations?.length||0;
  const reviewGaps=(gaps||[]).filter(g=>["Detected","Under Review"].includes(g.status)).length;
  const confirmedGaps=(gaps||[]).filter(g=>!terminalGap.has(g.status)&&!["Detected","Under Review"].includes(g.status)).length;
  const actionCount=actions?.length||0;
  const openWork=(workItems||[]).filter(x=>!terminalWork.has(x.status)).length;
  const overdue=(workItems||[]).filter(x=>!terminalWork.has(x.status)&&x.due_at&&new Date(x.due_at).getTime()<Date.now()).length;
  const closed=(gaps||[]).filter(g=>["Resolved","Closed"].includes(g.status)).length;

  const steps=[
    {n:"01",title:"Project",desc:"Create the project boundary once.",count:projectCount,ok:projectCount>0,href:"/projects",cta:"Project register"},
    {n:"02",title:"Contract",desc:"Create one contract master record per project/reference.",count:contractCount,ok:contractCount>0,href:"/contracts",cta:"Contract master"},
    {n:"03",title:"Controlled documents",desc:"Upload each source once. Later changes are immutable revisions.",count:docCount,ok:docCount>0,href:"/documents",cta:"Documents"},
    {n:"04",title:"Human review",desc:"Review extracted structure before it can become evidence.",count:ready,warning:needsReview,ok:ready>0&&needsReview===0,href:"/obligations",cta:"Review extraction"},
    {n:"05",title:"Evidence / OUGHT",desc:"Cited evidence and reviewed obligations become the analysis scope.",count:evidenceCount+obligationCount,ok:evidenceCount>0&&obligationCount>0,href:"/evidence",cta:"Evidence & obligations"},
    {n:"06",title:"Gap review",desc:"AI may propose; a human confirms, rejects or defers.",count:reviewGaps,warning:reviewGaps,ok:reviewGaps===0&&(gaps?.length||0)>0,href:reviewGaps?"/gaps":"/analyst",cta:reviewGaps?"Review proposed Gaps":"Analyze position"},
    {n:"07",title:"Execution",desc:"Confirmed ACTION is saved once; execution lives in the shared work queue.",count:openWork,warning:overdue,ok:openWork===0&&actionCount>0,href:"/communication",cta:"Messaging Center"},
    {n:"08",title:"Outcome",desc:"Close the Gap only when work and evidence support the outcome.",count:closed,ok:closed>0,href:"/gaps",cta:"Gap outcomes"}
  ];

  const next=
    projectCount===0?steps[0]:
    contractCount===0?steps[1]:
    docCount===0?steps[2]:
    needsReview>0||ready===0?steps[3]:
    evidenceCount===0||obligationCount===0?steps[4]:
    reviewGaps>0?steps[5]:
    openWork>0?steps[6]:
    confirmedGaps>0?steps[6]:
    steps[5];

  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead flowStudioHead">
      <div>
        <div className="eyebrow">Single integrated operating flow</div>
        <h1>Flow Studio</h1>
        <div className="muted">One record once. Human-controlled progression from contractual source to accountable outcome.</div>
      </div>
      <div className="singleSaveRule"><span>1×</span><div><b>Canonical record policy</b><small>Create once · reference everywhere · revise, never duplicate</small></div></div>
    </div>

    <section className="flowNext card">
      <div>
        <div className="eyebrow">NEXT REQUIRED STEP</div>
        <h2>{next.n} · {next.title}</h2>
        <p>{next.desc}</p>
      </div>
      <Link href={next.href} className="btn primary">{next.cta} →</Link>
    </section>

    <section className="flowRail">
      {steps.map((s,i)=><div key={s.n} className={"flowStep "+(s.ok?"done":"pending")+(s.warning?" attention":"")}>
        <div className="flowStepTop"><span>{s.ok?"✓":s.n}</span><em>{s.ok?"Ready":s.warning?"Attention":"Next / pending"}</em></div>
        <h3>{s.title}</h3>
        <p>{s.desc}</p>
        <div className="flowStepStats">
          <b>{s.count}</b><span>record{s.count===1?"":"s"}</span>
          {!!s.warning&&<strong>{s.warning} need attention</strong>}
        </div>
        <Link href={s.href}>{s.cta} →</Link>
        {i<steps.length-1&&<div className="flowConnector">→</div>}
      </div>)}
    </section>

    <section className="flowRules">
      <div className="card cardBody">
        <div className="eyebrow">SAVE ONCE</div>
        <h3>Master data</h3>
        <p>Project codes, contract references and exact document content are protected by database uniqueness. Repeated submissions resolve to the existing business record instead of creating another.</p>
      </div>
      <div className="card cardBody">
        <div className="eyebrow">WORK ONCE</div>
        <h3>Accountability</h3>
        <p>Document work and Gap actions enter the same work queue. Messaging Center handles ownership, forwarding, status, deadlines and overdue alerts.</p>
      </div>
      <div className="card cardBody">
        <div className="eyebrow">APPROVE ONCE</div>
        <h3>Human control</h3>
        <p>Extraction must be reviewed before it becomes eligible evidence. AI Gap candidates remain Under Review until a human confirms the position.</p>
      </div>
    </section>
  </AppShell>
}
