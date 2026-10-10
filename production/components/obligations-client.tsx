"use client";
import {useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Contract={id:string;title:string;contract_number:string|null};
type Version={id:string;document_id:string;file_name:string;version_no:number;processing_status:string;extracted_at:string|null};
type Clause={id:string;contract_id:string;document_version_id:string;clause_number:string|null;heading:string|null;clause_text:string;source_locator:string;confidence:string|null};
type Definition={id:string;contract_id:string;document_version_id:string;term:string;definition_text:string;source_locator:string;confidence:string|null};
type Obligation={id:string;contract_id:string;document_version_id:string;clause_id:string|null;obligation_type:string|null;responsible_party:string|null;beneficiary_party:string|null;obligation_text:string;trigger_condition:string|null;timing_requirement:string|null;consequence:string|null;source_locator:string;status:string;confidence:string|null};

export function ObligationsClient({contracts,versions,clauses,definitions,obligations}:{contracts:Contract[];versions:Version[];clauses:Clause[];definitions:Definition[];obligations:Obligation[]}){
  const [contractId,setContractId]=useState(contracts[0]?.id||""),[tab,setTab]=useState<"obligations"|"clauses"|"definitions">("obligations"),[message,setMessage]=useState("");
  const filtered=useMemo(()=>({
    obligations:obligations.filter(x=>x.contract_id===contractId),
    clauses:clauses.filter(x=>x.contract_id===contractId),
    definitions:definitions.filter(x=>x.contract_id===contractId)
  }),[contractId,obligations,clauses,definitions]);

  const hasStructure=filtered.obligations.length>0||filtered.clauses.length>0||filtered.definitions.length>0;

  async function markReviewed(){
    const ids=Array.from(new Set([...filtered.obligations.map(x=>x.document_version_id),...filtered.clauses.map(x=>x.document_version_id)]));
    if(!ids.length)return;
    const s=createClient();if(!s)return;
    const {error}=await s.from("document_versions").update({processing_status:"ready"}).in("id",ids);
    setMessage(error?error.message:"Extracted structure marked ready for Gap analysis.");
  }

  return <div>
    <div className="coreToolbar"><div><label htmlFor="ob-contract">Contract</label><select id="ob-contract" value={contractId} onChange={e=>setContractId(e.target.value)}>{contracts.map(c=><option value={c.id} key={c.id}>{c.contract_number?c.contract_number+" · ":""}{c.title}</option>)}</select></div><div className="tabStrip"><button className={tab==="obligations"?"active":""} onClick={()=>setTab("obligations")}>Obligations {filtered.obligations.length}</button><button className={tab==="clauses"?"active":""} onClick={()=>setTab("clauses")}>Clauses {filtered.clauses.length}</button><button className={tab==="definitions"?"active":""} onClick={()=>setTab("definitions")}>Definitions {filtered.definitions.length}</button></div><button className="btn primary" onClick={markReviewed} disabled={!contractId||!hasStructure}>Mark structure reviewed</button></div>
    {message&&<div className="notice" style={{marginBottom:12}}>{message}</div>}
    {tab==="obligations"&&<div className="card"><div className="tableWrap"><table><thead><tr><th>Party</th><th>Obligation</th><th>Trigger / timing</th><th>Source</th><th>Confidence</th><th>Status</th></tr></thead><tbody>{filtered.obligations.map(o=><tr key={o.id}><td><b>{o.responsible_party||"Unspecified"}</b><div className="meta">{o.obligation_type||"Obligation"}</div></td><td>{o.obligation_text}<div className="meta">{o.consequence||""}</div></td><td><div>{o.trigger_condition||"—"}</div><div className="meta">{o.timing_requirement||"—"}</div></td><td><code>{o.source_locator}</code></td><td><span className="badge neutral">{o.confidence||"—"}</span></td><td><span className="badge neutral">{o.status}</span></td></tr>)}</tbody></table></div>{!filtered.obligations.length&&<div className="emptyState">No extracted obligations yet. Process a contract document from Documents.</div>}</div>}
    {tab==="clauses"&&<div className="contractStructureGrid">{filtered.clauses.map(c=><article className="card structureCard" key={c.id}><div className="eyebrow">{c.clause_number||"Clause"}</div><h3>{c.heading||"Untitled clause"}</h3><p>{c.clause_text}</p><div className="sourceLine">{c.source_locator} · {c.confidence||"—"} confidence</div></article>)}</div>}
    {tab==="definitions"&&<div className="contractStructureGrid">{filtered.definitions.map(d=><article className="card structureCard" key={d.id}><div className="eyebrow">Defined term</div><h3>{d.term}</h3><p>{d.definition_text}</p><div className="sourceLine">{d.source_locator} · {d.confidence||"—"} confidence</div></article>)}</div>}
    <div className="versionStatus">{versions.filter(v=>["needs review","failed","processing"].includes(v.processing_status)).map(v=><span key={v.id} className="badge neutral">{v.file_name} v{v.version_no}: {v.processing_status}</span>)}</div>
  </div>
}
