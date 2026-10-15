"use client";
import {FormEvent,useMemo,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";
export function GapReviewClient({gap:initial,evidence,links,history,members,actions:initialActions,userId}:{gap:any;evidence:any[];links:any[];history:any[];members:any[];actions:any[];userId:string}){
 const [gap,setGap]=useState(initial),[actions,setActions]=useState(initialActions),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);\n const actionRequestId=useRef("");
 const names=useMemo(()=>Object.fromEntries(members.map((m:any)=>[m.user_id,m.display_name||m.email||"Team member"])),[members]);\n const canExecute=["Confirmed","Action Required","In Progress"].includes(gap.status);
 async function transition(status:string){const s=createClient();if(!s)return;const {data,error}=await s.from("gaps").update({status}).eq("id",gap.id).select("*").single();if(error){setMessage(error.message);return}setGap(data);setMessage("Gap status changed to "+status+".")}
 async function createAction(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMessage("");
  const form=e.currentTarget,f=new FormData(form),owner=String(f.get("owner")||"")||null,due=String(f.get("due")||"")||null,text=String(f.get("text")||gap.action).trim();
  try{
   if(!owner)throw new Error("Select an owner so the action can enter the shared work queue.");
   if(!text)throw new Error("Required action is missing.");
   if(!actionRequestId.current)actionRequestId.current=crypto.randomUUID();
   const s=createClient();if(!s)throw new Error("Service unavailable.");
   const {error}=await s.rpc("create_gap_action_with_work",{
    p_gap_id:gap.id,p_action_text:text,p_owner_user_id:owner,p_due_at:due||null,p_request_id:actionRequestId.current
   });
   if(error)throw error;
   const {data:rows,error:readError}=await s.from("actions").select("id,action_text,owner_user_id,owner_label,due_at,status,completion_evidence,created_at").eq("organization_id",gap.organization_id).eq("gap_id",gap.id).order("created_at",{ascending:false});
   if(readError)throw readError;
   setActions(rows||[]);
   actionRequestId.current="";
   if(gap.status==="Confirmed")setGap({...gap,status:"Action Required"});
   form.reset();
   setMessage("Action saved once and its execution work was assigned in Messaging Center.");
  }catch(error){setMessage(error instanceof Error?error.message:"Could not create accountable action.");}
  finally{setBusy(false)}
 }
 const fields=[["WHAT IT IS",gap.what_is],["WHAT IT OUGHT TO BE",gap.what_ought_to_be],["WHY",gap.why],["GAP",gap.gap],["IMPACT",gap.impact],["ACTION",gap.action],["OWNER",gap.owner_user_id?names[gap.owner_user_id]:gap.owner_label||"Unassigned"],["DEADLINE",gap.deadline||"—"],["STATUS",gap.status]];
 return <div><div className="pageHead"><div><div className="eyebrow">Gap detail · human-controlled</div><h1>{gap.gap}</h1><div className="muted">{gap.severity} severity · {gap.confidence||"—"} confidence · {gap.source_kind==="ai"?"AI proposed":"Human created"}</div></div><div className="reviewActions"><button className="btn" onClick={()=>transition("Rejected")}>Reject</button><button className="btn" onClick={()=>transition("Deferred")}>Defer</button><button className="btn primary" onClick={()=>transition("Confirmed")}>Confirm finding</button></div></div>
 {message&&<div className="notice" style={{marginBottom:14}}>{message}</div>}
 <div className="gapDetailGrid"><section className="card cardBody">{fields.map(([k,v])=><div className="analysisField" key={k}><div className="eyebrow">{k}</div><div>{v}</div></div>)}</section><aside className="stack"><section className="card"><div className="cardHead"><h2>EVIDENCE</h2><span className="badge neutral">{evidence.length}</span></div><div className="cardBody list">{evidence.map((ev:any)=><div className="listItem" key={ev.id}><b>{ev.documents?.file_name||"Source"}</b><div className="meta"><code>{ev.source_locator}</code> · {ev.evidence_kind}</div><p>{ev.excerpt||"—"}</p></div>)}{!evidence.length&&links.map((l:any,i:number)=><div className="listItem" key={i}><b>{l.documents?.file_name||"Document"}</b><div className="meta">{l.locator} · {l.evidence_kind}</div><p>{l.note||"Linked evidence"}</p></div>)}</div></section>
 <section className="card"><div className="cardHead"><div><h2>Create action</h2><div className="muted">One save creates the Gap action and one linked execution item in Messaging Center.</div></div></div><div className="cardBody">{!canExecute?<div className="notice">Confirm the Gap first. Under Review, Rejected and Deferred findings cannot create execution work.</div>:<form onSubmit={createAction}><label htmlFor="action-text">Required action</label><textarea id="action-text" name="text" defaultValue={gap.action}/><label htmlFor="action-owner">Owner</label><select id="action-owner" name="owner" required><option value="">Select owner</option>{members.map((m:any)=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email}</option>)}</select><label htmlFor="action-due">Deadline</label><input id="action-due" name="due" type="date" defaultValue={gap.deadline||""}/><button className="btn primary" style={{width:"100%",marginTop:12}} disabled={busy}>{busy?"Saving once…":"Save action & assign work"}</button></form>}</div></section></aside></div>
 <div className="split" style={{marginTop:14}}><section className="card"><div className="cardHead"><h2>Linked actions</h2></div><div className="cardBody list">{actions.map((a:any)=><div className="listItem" key={a.id}><b>{a.action_text}</b><div className="meta">{a.owner_user_id?names[a.owner_user_id]:a.owner_label||"Unassigned"} · {a.due_at||"No deadline"} · {a.status}</div></div>)}</div></section><section className="card"><div className="cardHead"><h2>Append-only history</h2></div><div className="cardBody list">{history.map((h:any)=><div className="listItem" key={h.id}><b>{h.event}</b><div className="meta">{names[h.actor_user_id]||"System"} · {new Date(h.created_at).toLocaleString()}</div></div>)}</div></section></div>
 </div>
}