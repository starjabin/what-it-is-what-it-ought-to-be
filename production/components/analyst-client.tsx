"use client";

import {FormEvent,useState} from "react";

type Proposal={
  what_is:string;what_ought_to_be:string;why:string;evidence:string[];gap:string;impact:string;action:string;
  owner:string;deadline:string;status:string;severity:string;confidence:string;missing_information:string[];
};

export function AnalystClient(){
  const [text,setText]=useState("");
  const [context,setContext]=useState("");
  const [proposal,setProposal]=useState<Proposal|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function analyze(e:FormEvent){
    e.preventDefault();if(!text.trim())return;
    setBusy(true);setMessage("");setProposal(null);
    try{
      const res=await fetch("/api/ai/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,context})});
      const data=await res.json();
      if(!res.ok){setMessage(data.error||"Analysis failed.");return}
      setProposal(data.proposal);
    }catch{setMessage("Analysis failed. Please try again.")}
    finally{setBusy(false)}
  }

  const fields: [string,string|string[]][] = proposal ? [
    ["WHAT IT IS",proposal.what_is],["WHAT IT OUGHT TO BE",proposal.what_ought_to_be],["WHY",proposal.why],
    ["EVIDENCE",proposal.evidence],["GAP",proposal.gap],["IMPACT",proposal.impact],["ACTION",proposal.action],
    ["OWNER",proposal.owner],["DEADLINE",proposal.deadline],["STATUS",proposal.status],
    ["SEVERITY",proposal.severity],["CONFIDENCE",proposal.confidence],["MISSING INFORMATION",proposal.missing_information]
  ] : [];

  return <div className="analystGrid">
    <form className="card cardBody" onSubmit={analyze}>
      <div className="eyebrow">Evidence input</div>
      <h2>Analyze a contract record</h2>
      <p className="muted">Paste source material for a proposed Gap record. AI proposals require human review before operational use.</p>
      <label>Context</label>
      <textarea value={context} onChange={e=>setContext(e.target.value)} rows={4} placeholder="Project, contract, event, question or analysis objective…"/>
      <label>Source material</label>
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={14} maxLength={120000} placeholder="Paste the relevant clause, instruction, correspondence, programme narrative or other evidence…" required/>
      <button className="btn primary" style={{marginTop:14}} disabled={busy}>{busy?"Analyzing…":"Run Gap analysis"}</button>
      {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
    </form>
    <section className="card">
      <div className="cardHead"><h2>Proposed Gap record</h2><span className="badge neutral">Human review required</span></div>
      <div className="cardBody">
        {!proposal?<div className="emptyState">Run an analysis to generate a structured, evidence-led proposal.</div>:
          <div>{fields.map(([label,value])=><div className="analysisField" key={label}><div className="eyebrow">{label}</div><div>{Array.isArray(value)?(value.length?value.join(" · "):"None identified"):value||"—"}</div></div>)}</div>}
      </div>
    </section>
  </div>
}
