"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import Link from "next/link";

type Evidence={id:string;source_type:string;source_locator:string;excerpt:string|null;evidence_kind:string};
type Obligation={id:string;responsible_party:string|null;obligation_text:string;timing_requirement:string|null;source_locator:string;status:string;confidence:string|null};
type Doc={id:string;file_name:string;document_type:string|null;processing_status:string};
type Candidate={id:string;gap:string;status:string;severity:string;confidence:string|null;created_at:string};
type Scope={
  id:string;project_id:string;contract_number:string|null;title:string;contract_type:string|null;status:string;
  currency:string|null;contract_value:number|null;documents:Doc[];ready_versions:number;failed_versions:number;
  needs_review_versions:number;evidence:Evidence[];obligations:Obligation[];candidates:Candidate[];
};
type Proposal={
  what_is:string;what_ought_to_be:string;why:string;evidence_ids:string[];gap:string;impact:string;action:string;
  owner:string;deadline:string;status:string;severity:string;confidence:string;missing_information:string[];
};
type Result={proposal:Proposal;gap_id:string;model:string;response_id:string;citation_count?:number};

const objectives=[
  ["Material gap scan","Identify material contractual gaps that require review or accountable action."],
  ["Notice compliance","Identify notice, time-bar, communication and procedural compliance gaps supported by the reviewed evidence."],
  ["Payment & commercial","Identify payment, valuation, variation and commercial-control gaps supported by the reviewed evidence."],
  ["Programme & delay","Identify programme, delay, milestone and time-obligation gaps supported by the reviewed evidence."],
  ["Evidence completeness","Identify material obligations for which the reviewed evidence is missing, contradictory or insufficient."]
] as const;

export function AnalystClient({scopes}:{scopes:Scope[]}){
  const [contractId,setContractId]=useState(scopes[0]?.id||"");
  const [objective,setObjective]=useState<string>(objectives[0][1]);
  const [result,setResult]=useState<Result|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [health,setHealth]=useState<"checking"|"healthy"|"unavailable">("checking");

  const scope=useMemo(()=>scopes.find(s=>s.id===contractId)||null,[contractId,scopes]);
  const readiness={
    source:!!scope&&scope.documents.length>0,
    reviewed:!!scope&&scope.ready_versions>0,
    evidence:!!scope&&scope.evidence.length>0,
    obligations:!!scope&&scope.obligations.length>0
  };
  const analysisReady=!!scope&&readiness.source&&readiness.reviewed&&readiness.evidence&&readiness.obligations&&health==="healthy";

  useEffect(()=>{
    let alive=true;
    fetch("/api/ai/health",{cache:"no-store"})
      .then(r=>{if(alive)setHealth(r.ok?"healthy":"unavailable")})
      .catch(()=>{if(alive)setHealth("unavailable")});
    return()=>{alive=false};
  },[]);

  function changeContract(id:string){
    setContractId(id);setResult(null);setMessage("");
  }

  async function analyze(e:FormEvent){
    e.preventDefault();
    if(!scope||!analysisReady)return;
    setBusy(true);setMessage("");setResult(null);
    try{
      const res=await fetch("/api/ai/analyze",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({contractId:scope.id,objective})
      });
      const data=await res.json();
      if(!res.ok){
        setMessage(data.error||"Analysis could not be completed.");
        if(res.status===503)setHealth("unavailable");
        return;
      }
      setResult(data as Result);
      setMessage("Gap candidate created Under Review. Verify every cited source before confirming it.");
    }catch{
      setMessage("Analysis failed safely. No Gap was confirmed and no external action was taken.");
    }finally{
      setBusy(false);
    }
  }

  const cited=(result?.proposal.evidence_ids||[])
    .map(id=>scope?.evidence.find(e=>e.id===id))
    .filter((e):e is Evidence=>Boolean(e));

  const blockers:Array<{title:string;detail:string;href:string}>=[];
  if(!readiness.source)blockers.push({title:"Controlled contract source",detail:"Upload at least one contract-linked source document.",href:"/documents"});
  if(readiness.source&&!readiness.reviewed)blockers.push({title:"Reviewed extraction",detail:scope?.needs_review_versions?"Review the extracted structure and mark it ready.":"Process the contract source, then review the extraction.",href:"/obligations"});
  if(readiness.reviewed&&!readiness.evidence)blockers.push({title:"Cited evidence",detail:"No reviewed evidence records are available from ready source revisions.",href:"/evidence"});
  if(readiness.reviewed&&!readiness.obligations)blockers.push({title:"Obligations / OUGHT",detail:"No reviewed obligations are available from ready source revisions.",href:"/obligations"});
  if(health==="unavailable")blockers.push({title:"AI provider",detail:"The configured AI provider is unavailable. Analysis remains blocked until the health check passes.",href:"/settings/ai"});

  return <div className="analystWorkbench">
    <section className="analystScopeCard">
      <div className="analystSectionHead">
        <div><span>01</span><div><b>Workflow gates</b><small>Automatically driven by contract records</small></div></div>
        <span className={"analystHealth "+health}><i/>{health==="healthy"?"AI available":health==="checking"?"Checking AI":"AI unavailable"}</span>
      </div>

      <label htmlFor="analyst-contract">Contract</label>
      <select id="analyst-contract" value={contractId} onChange={e=>changeContract(e.target.value)}>
        <option value="">Select contract</option>
        {scopes.map(c=><option key={c.id} value={c.id}>{c.contract_number?c.contract_number+" · ":""}{c.title}</option>)}
      </select>

      {scope&&<div className="analystContractMeta">
        <div><span>Type</span><b>{scope.contract_type||"Contract"}</b></div>
        <div><span>Status</span><b>{scope.status}</b></div>
        <div><span>Sources</span><b>{scope.documents.length}</b></div>
        <div><span>Ready revisions</span><b>{scope.ready_versions}</b></div>
      </div>}

      <div className="analystWorkflowLine">
        <Gate ok={readiness.source} n="1" title="Controlled contract source" detail={scope?scope.documents.length+" source document"+(scope.documents.length===1?"":"s"):"Select a contract"}/>
        <span className="workflowArrow">→</span>
        <Gate ok={readiness.reviewed} n="2" title="Reviewed extraction" detail={scope?scope.ready_versions+" ready revision"+(scope.ready_versions===1?"":"s"):"Not available"}/>
        <span className="workflowArrow">→</span>
        <Gate ok={readiness.evidence} n="3" title="Cited evidence" detail={scope?scope.evidence.length+" evidence record"+(scope.evidence.length===1?"":"s"):"Not available"}/>
        <span className="workflowArrow">→</span>
        <Gate ok={readiness.obligations} n="4" title="Obligations / OUGHT" detail={scope?scope.obligations.length+" obligation"+(scope.obligations.length===1?"":"s"):"Not available"}/>
      </div>

      {!!blockers.length&&<div className="analystBlockers">
        <div className="eyebrow">Next required action</div>
        {blockers.map(b=><Link href={b.href} key={b.title}><div><b>{b.title}</b><span>{b.detail}</span></div><em>Open →</em></Link>)}
      </div>}
      {analysisReady&&<div className="analystReadyBanner"><span>✓</span><div><b>All four workflow gates passed</b><small>This contract is eligible for evidence-grounded Gap analysis.</small></div></div>}
    </section>

    <section className="analystRunCard">
      <div className="analystSectionHead">
        <div><span>02</span><div><b>Analysis objective</b><small>Instruction only — never evidence</small></div></div>
        <span className="analystSafeBadge">SOURCE-BOUND</span>
      </div>

      <div className="objectiveTemplates">
        {objectives.map(([label,text])=><button type="button" key={label} className={objective===text?"active":""} onClick={()=>setObjective(text)}>{label}</button>)}
      </div>

      <form onSubmit={analyze}>
        <label htmlFor="analysis-objective">Objective</label>
        <textarea id="analysis-objective" maxLength={600} value={objective} onChange={e=>setObjective(e.target.value)} rows={5}/>
        <div className="objectiveNote"><span>i</span><p>This instruction tells the Analyst what to test. It cannot supply facts, clauses, dates, entitlement or evidence.</p></div>

        <div className="analystRunSummary">
          <div><span>Evidence in scope</span><b>{scope?.evidence.length||0}</b></div>
          <div><span>Obligations in scope</span><b>{scope?.obligations.length||0}</b></div>
          <div><span>Result status</span><b>Under Review</b></div>
        </div>

        <button className="btn primary analystRunButton" disabled={busy||!analysisReady||!objective.trim()}>
          {busy?"Analyzing reviewed evidence…":"Generate Gap candidate"}
        </button>
        {!analysisReady&&<div className="analystDisabledNote">The analysis trigger remains locked until all four gates and provider health pass.</div>}
        {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
      </form>
    </section>

    <section className="analystSourcePack">
      <div className="analystSectionHead">
        <div><span>03</span><div><b>Source pack</b><small>Records eligible to support the analysis</small></div></div>
        <span className="badge neutral">{(scope?.evidence.length||0)+(scope?.obligations.length||0)} records</span>
      </div>

      {!scope?<div className="analystEmpty">Select a contract to inspect its analysis scope.</div>:<div className="sourcePackSplit">
        <div>
          <div className="sourcePackTitle">Cited evidence <span>{scope.evidence.length}</span></div>
          <div className="sourcePackList">
            {scope.evidence.slice(0,8).map(e=><div className="sourcePackItem" key={e.id}><div><b>{e.source_locator}</b><span>{e.source_type} · {e.evidence_kind}</span></div><p>{e.excerpt||"No excerpt stored."}</p></div>)}
            {!scope.evidence.length&&<div className="sourcePackEmpty">No reviewed evidence is eligible yet.</div>}
          </div>
        </div>
        <div>
          <div className="sourcePackTitle">Obligations / OUGHT <span>{scope.obligations.length}</span></div>
          <div className="sourcePackList">
            {scope.obligations.slice(0,8).map(o=><div className="sourcePackItem" key={o.id}><div><b>{o.source_locator}</b><span>{o.responsible_party||"Unspecified party"} · {o.status} · {o.confidence||"—"} confidence</span></div><p>{o.obligation_text}</p></div>)}
            {!scope.obligations.length&&<div className="sourcePackEmpty">No reviewed obligations are eligible yet.</div>}
          </div>
        </div>
      </div>}
    </section>

    <section className="analystCandidateCard">
      <div className="analystSectionHead">
        <div><span>04</span><div><b>Proposed Gap</b><small>AI proposal — human review required</small></div></div>
        <span className={result?"badge medium":"badge neutral"}>{result?"Under Review":"No candidate"}</span>
      </div>

      {!result?<div className="candidateEmpty">
        <div className="candidateEmptyMark">GAP</div>
        <h3>No AI candidate in this session</h3>
        <p>The Workbench will only unlock when the controlled source, reviewed extraction, cited evidence and obligations/OUGHT are all present.</p>
        <div className="candidateRules"><span>✓ No automatic approval</span><span>✓ No external correspondence</span><span>✓ No legal certainty</span></div>
      </div>:<div className="candidateBody">
        <div className="candidateHero">
          <div><span className={"badge "+result.proposal.severity.toLowerCase()}>{result.proposal.severity}</span><span className="badge neutral">{result.proposal.confidence} confidence</span></div>
          <h2>{result.proposal.gap}</h2>
          <p>{result.proposal.impact}</p>
        </div>

        <div className="candidateFramework">
          <CandidateField label="WHAT IT IS" value={result.proposal.what_is}/>
          <CandidateField label="WHAT IT OUGHT TO BE" value={result.proposal.what_ought_to_be}/>
          <CandidateField label="WHY" value={result.proposal.why}/>
          <CandidateField label="ACTION" value={result.proposal.action}/>
          <CandidateField label="OWNER" value={result.proposal.owner||"Unassigned"}/>
          <CandidateField label="DEADLINE" value={result.proposal.deadline||"Not stated"}/>
        </div>

        <div className="candidateEvidence">
          <div className="sourcePackTitle">Cited evidence <span>{cited.length}</span></div>
          {cited.map(e=><div className="candidateCitation" key={e.id}><b>{e.source_locator}</b><span>{e.excerpt||e.source_type}</span></div>)}
          {!cited.length&&<div className="sourcePackEmpty">No valid evidence citation was selected. Do not confirm this candidate.</div>}
        </div>

        {!!result.proposal.missing_information.length&&<div className="candidateMissing">
          <b>Missing information</b>
          {result.proposal.missing_information.map((x,i)=><span key={i}>• {x}</span>)}
        </div>}

        <div className="candidateProvenance"><span>Model: {result.model}</span><span>Response: {result.response_id}</span><span>Status: Under Review</span></div>
        <Link className="btn primary" href={"/gaps/"+result.gap_id}>Open human review record</Link>
      </div>}
    </section>

    {!!scope?.candidates.length&&<section className="analystHistory">
      <div className="analystSectionHead"><div><span>05</span><div><b>Recent AI candidates</b><small>Existing review records for this contract</small></div></div></div>
      <div className="analystHistoryGrid">
        {scope.candidates.map(c=><Link href={"/gaps/"+c.id} key={c.id}><div><span className={"badge "+c.severity.toLowerCase()}>{c.severity}</span><span className="badge neutral">{c.status}</span></div><b>{c.gap}</b><small>{new Date(c.created_at).toLocaleString()}</small></Link>)}
      </div>
    </section>}
  </div>
}

function Gate({ok,n,title,detail}:{ok:boolean;n:string;title:string;detail:string}){
  return <div className={"analystGate "+(ok?"ready":"blocked")}><span>{ok?"✓":n}</span><div><b>{title}</b><small>{detail}</small></div></div>
}

function CandidateField({label,value}:{label:string;value:string}){
  return <div className="candidateField"><div className="eyebrow">{label}</div><p>{value||"—"}</p></div>
}
