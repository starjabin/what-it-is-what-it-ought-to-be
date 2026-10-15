"use client";
import {FormEvent,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
type Doc={id:string;project_id:string|null;contract_id:string|null;file_name:string;document_type:string|null;storage_path:string;content_hash:string|null;version_no:number;current_version_id:string|null;processing_status:string;created_at:string};
type Version={id:string;document_id:string;version_no:number;file_name:string;storage_path:string;content_hash:string|null;mime_type:string|null;byte_size:number|null;processing_status:string;processing_error:string|null;is_current:boolean;created_at:string;extracted_at:string|null};
type Project={id:string;code:string;name:string};
type Contract={id:string;project_id:string;contract_number:string|null;title:string};
type Assignment={id:string;document_id:string|null;project_id:string|null;contract_id:string|null;title:string;details:string|null;priority:string;assigned_to:string|null;assigned_by:string;due_at:string|null;status:string;created_at:string;client_request_id:string|null};
type Member={user_id:string;display_name:string|null;email:string|null};
const allowed=["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword","text/plain","text/csv","message/rfc822","image/png","image/jpeg","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel"];
function hex(buf:ArrayBuffer){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("")}
export function DocumentsCoreClient({orgId,userId,documents:initial,versions:initialVersions,projects,contracts,assignments:initialAssignments,members}:{orgId:string;userId:string;documents:Doc[];versions:Version[];projects:Project[];contracts:Contract[];assignments:Assignment[];members:Member[]}){
 const [docs,setDocs]=useState(initial),[versions,setVersions]=useState(initialVersions),[assignments,setAssignments]=useState(initialAssignments),[selected,setSelected]=useState(initial[0]?.id||""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);\n const workRequestId=useRef("");
 const names=useMemo(()=>Object.fromEntries(members.map(m=>[m.user_id,m.display_name||m.email||"Team member"])),[members]);
 const selectedDoc=docs.find(d=>d.id===selected);
 const selectedVersions=versions.filter(v=>v.document_id===selected).sort((a,b)=>b.version_no-a.version_no);
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMessage("");
  const form=e.currentTarget,f=new FormData(form),file=f.get("file") as File,projectId=String(f.get("project")||""),contractId=String(f.get("contract")||"")||null,type=String(f.get("type")||"Unclassified"),revisionOf=String(f.get("revisionOf")||"")||null;
  try{
   if(!file?.name||!projectId)throw new Error("Project and file are required.");
   if(file.size>104857600)throw new Error("Maximum file size is 100 MB.");
   if(file.type&&!allowed.includes(file.type))throw new Error("Unsupported file type.");
   if(type==="Contract"&&!contractId)throw new Error("Contract documents must be linked to a contract.");
   const s=createClient();if(!s)throw new Error("Storage service is unavailable.");
   const digest=hex(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()));
   const {data:dup}=await s.from("document_versions").select("id,document_id,file_name").eq("organization_id",orgId).eq("content_hash",digest).limit(1).maybeSingle();
   if(dup)throw new Error("Exact duplicate detected. This file already exists as "+dup.file_name+".");
   const docId=revisionOf||crypto.randomUUID();
   const current=revisionOf?Math.max(0,...versions.filter(v=>v.document_id===revisionOf).map(v=>v.version_no)):0;
   const versionNo=current+1,versionId=crypto.randomUUID(),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
   const path=orgId+"/"+projectId+"/"+docId+"/v"+versionNo+"-"+crypto.randomUUID()+"-"+safe;
   const up=await s.storage.from("contract-evidence").upload(path,file,{upsert:false,contentType:file.type||undefined});
   if(up.error)throw up.error;
   if(!revisionOf){
    const {error}=await s.from("documents").insert({id:docId,organization_id:orgId,project_id:projectId,contract_id:contractId,file_name:file.name,document_type:type,storage_path:path,content_hash:digest,version_no:versionNo,uploaded_by:userId,processing_status:"queued"});
    if(error){await s.storage.from("contract-evidence").remove([path]);throw error}
   }
   const {data:version,error:versionError}=await s.from("document_versions").insert({id:versionId,organization_id:orgId,document_id:docId,version_no:versionNo,file_name:file.name,storage_path:path,mime_type:file.type||null,byte_size:file.size,content_hash:digest,processing_status:"queued",is_current:true,created_by:userId}).select("*").single();
   if(versionError){if(!revisionOf)await s.from("documents").delete().eq("id",docId);await s.storage.from("contract-evidence").remove([path]);throw versionError}
   if(revisionOf){
    const {error}=await s.from("documents").update({project_id:projectId,contract_id:contractId,document_type:type}).eq("id",docId);
    if(error)throw error;
   }
   const {data:doc}=await s.from("documents").select("id,project_id,contract_id,file_name,document_type,storage_path,content_hash,version_no,current_version_id,processing_status,created_at").eq("id",docId).single();
   if(doc)setDocs(x=>[doc as Doc,...x.filter(d=>d.id!==docId)]);
   setVersions(x=>[version as Version,...x.filter(v=>!(v.document_id===docId&&v.id===versionId))]);setSelected(docId);form.reset();setMessage("Immutable revision uploaded. Run contract processing when the source is ready.");
  }catch(error){setMessage(error instanceof Error?error.message:"Upload failed safely.")}
  finally{setBusy(false)}
 }
 async function processDocument(doc:Doc){
  setBusy(true);setMessage("");
  try{
   const res=await fetch("/api/documents/process",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({documentId:doc.id})});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Processing failed.");
   setMessage("Extraction complete: "+data.counts.clauses+" clauses, "+data.counts.definitions+" definitions and "+data.counts.obligations+" obligations. Review them before Gap analysis.");
   const s=createClient();if(s){const {data:v}=await s.from("document_versions").select("*").eq("document_id",doc.id).order("version_no",{ascending:false});if(v)setVersions(v as Version[])}
  }catch(error){
    setMessage(error instanceof Error?error.message:"AI service temporarily unavailable. Please retry.");
    const s=createClient();
    if(s){
      const {data:v}=await s.from("document_versions").select("*").eq("document_id",doc.id).order("version_no",{ascending:false});
      if(v)setVersions(v as Version[]);
      const {data:d}=await s.from("documents").select("id,project_id,contract_id,file_name,document_type,storage_path,content_hash,version_no,current_version_id,processing_status,created_at").eq("id",doc.id).single();
      if(d)setDocs(x=>[d as Doc,...x.filter(item=>item.id!==doc.id)]);
    }
  }
  finally{setBusy(false)}
 }
 async function openVersion(v:Version){const s=createClient();if(!s)return;const {data,error}=await s.storage.from("contract-evidence").createSignedUrl(v.storage_path,120);if(error){setMessage(error.message);return}window.open(data.signedUrl,"_blank","noopener,noreferrer")}
 async function assign(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(busy)return;setBusy(true);setMessage("");
   const form=e.currentTarget,f=new FormData(form),docId=String(f.get("document")||selected),assignee=String(f.get("assignee")||"")||null,instruction=String(f.get("instruction")||"").trim(),priority=String(f.get("priority")||"Normal"),due=String(f.get("due")||"")||null;
   try{
    const doc=docs.find(d=>d.id===docId);
    if(!doc||!instruction)throw new Error("Document and required action are required.");
    if(!assignee)throw new Error("Select an owner for this work.");
    if(!workRequestId.current)workRequestId.current=crypto.randomUUID();
    const s=createClient();if(!s)throw new Error("Service unavailable.");
    const dueAt=due?new Date(due+"T23:59:00").toISOString():null;
    const {data,error}=await s.from("work_items").insert({
      organization_id:orgId,
      project_id:doc.project_id,
      contract_id:doc.contract_id,
      document_id:docId,
      title:"Document action · "+doc.file_name,
      details:instruction,
      priority,
      assigned_to:assignee,
      assigned_by:userId,
      due_at:dueAt,
      client_request_id:workRequestId.current
    }).select("id,document_id,project_id,contract_id,title,details,priority,assigned_to,assigned_by,due_at,status,created_at,client_request_id").single();
    if(error){
      if(error.code==="23505")throw new Error("This work request was already saved. Open Messaging Center to continue it.");
      throw error;
    }
    setAssignments(x=>[data as Assignment,...x.filter(a=>a.id!==data.id)]);
    workRequestId.current="";
    form.reset();
    setMessage("Work assigned once and added to the shared Messaging Center queue.");
   }catch(error){setMessage(error instanceof Error?error.message:"Could not assign work.");}
   finally{setBusy(false)}
 }
 async function changeStatus(id:string,status:string){const s=createClient();if(!s)return;const {data,error}=await s.from("work_items").update({status}).eq("id",id).select("id,document_id,project_id,contract_id,title,details,priority,assigned_to,assigned_by,due_at,status,created_at,client_request_id").single();if(!error&&data)setAssignments(assignments.map(a=>a.id===id?data as Assignment:a))}
 const contractOptions=contracts.filter(c=>!selectedDoc?.project_id||c.project_id===selectedDoc.project_id);
 return <div className="documentsLayout">
  <section className="card"><div className="cardHead"><div><h2>Document register</h2><div className="muted">{docs.length} logical document{docs.length===1?"":"s"} · immutable revisions retained</div></div><Link className="btn" href="/obligations">Review extraction →</Link></div><div className="docList">{docs.length===0?<div className="emptyState">Upload the first contract package.</div>:docs.map(d=><button type="button" key={d.id} className={selected===d.id?"docRow active":"docRow"} onClick={()=>setSelected(d.id)}><div className="docIcon">DOC</div><div><b>{d.file_name}</b><span>{d.document_type||"Unclassified"} · {projects.find(p=>p.id===d.project_id)?.code||"General"} · v{d.version_no}</span><span className="meta">{contracts.find(c=>c.id===d.contract_id)?.title||"Project evidence"} · {d.processing_status}</span></div><div className="docActions"><span>{d.processing_status}</span></div></button>)}</div>
   {selectedDoc&&<div className="revisionPanel"><div className="cardHead"><h3>Revision history</h3>{selectedDoc.contract_id&&<button className="btn primary" onClick={()=>processDocument(selectedDoc)} disabled={busy}>{busy?"Processing…":"Process current revision"}</button>}</div>{selectedVersions.map(v=><div className="revisionRow" key={v.id}><div><b>v{v.version_no} · {v.file_name}</b><span>{new Date(v.created_at).toLocaleString()} · {v.processing_status}{v.processing_error?" · "+v.processing_error:""}</span></div><button className="btn" onClick={()=>openVersion(v)}>Open source</button></div>)}</div>}
  </section>
  <aside className="stack"><section className="card"><div className="cardHead"><h2>Upload / new revision</h2></div><div className="cardBody"><form onSubmit={upload}>
   <label htmlFor="doc-revision">Revision of</label><select id="doc-revision" name="revisionOf" defaultValue=""><option value="">New logical document</option>{docs.map(d=><option key={d.id} value={d.id}>{d.file_name}</option>)}</select>
   <label htmlFor="doc-file">File</label><input id="doc-file" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.eml,.png,.jpg,.jpeg" required/>
   <label htmlFor="doc-project">Project</label><select id="doc-project" name="project" required><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
   <label htmlFor="doc-contract">Contract</label><select id="doc-contract" name="contract"><option value="">Project evidence / no contract</option>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_number?c.contract_number+" · ":""}{c.title}</option>)}</select>
   <label htmlFor="doc-type">Document type</label><select id="doc-type" name="type"><option>Contract</option><option>Instruction</option><option>Correspondence</option><option>Programme</option><option>Commercial Record</option><option>Meeting Record</option><option>Technical Record</option><option>Unclassified</option></select>
   <button className="btn primary" style={{width:"100%",marginTop:14}} disabled={busy}>{busy?"Working…":"Upload privately"}</button>
  </form></div></section>
  <section className="card"><div className="cardHead"><div><h2>Assign work</h2><div className="muted">Creates one shared work record used by Documents and Messaging Center.</div></div></div><div className="cardBody"><form onSubmit={assign}>
   <label htmlFor="assign-doc">Document</label><select id="assign-doc" name="document" value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Select document</option>{docs.map(d=><option key={d.id} value={d.id}>{d.file_name}</option>)}</select>
   <label htmlFor="assign-user">Owner</label><select id="assign-user" name="assignee" required><option value="">Select owner</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email||"Team member"}</option>)}</select>
   <label htmlFor="assign-instruction">Required action</label><textarea id="assign-instruction" name="instruction" required/>
   <div className="formTwo"><div><label htmlFor="assign-priority">Priority</label><select id="assign-priority" name="priority"><option>Normal</option><option>High</option><option>Urgent</option><option>Low</option></select></div><div><label htmlFor="assign-due">Due date</label><input id="assign-due" name="due" type="date"/></div></div>
   <button className="btn primary" style={{width:"100%",marginTop:14}} disabled={busy}>{busy?"Saving once…":"Assign & notify"}</button>
  </form></div></section></aside>
  <section className="card wideCard"><div className="cardHead"><div><h2>Linked work</h2><div className="muted">Same canonical records shown in Messaging Center—no second assignment register.</div></div><span className="badge neutral">{assignments.filter(a=>!["Completed","Closed","Cancelled"].includes(a.status)).length} open</span></div><div className="tableWrap"><table><thead><tr><th>Document</th><th>Required action</th><th>Owner</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead><tbody>{assignments.map(a=><tr key={a.id}><td><b>{docs.find(d=>d.id===a.document_id)?.file_name||"Document"}</b></td><td>{a.details||a.title}</td><td>{a.assigned_to?names[a.assigned_to]:"Unassigned"}</td><td><span className={"badge "+(a.priority==="Urgent"?"critical":a.priority==="High"?"high":"neutral")}>{a.priority}</span></td><td>{a.due_at?new Date(a.due_at).toLocaleString():"—"}</td><td><select aria-label="Work status" value={a.status} onChange={e=>changeStatus(a.id,e.target.value)}><option>Assigned</option><option>Accepted</option><option>In Progress</option><option>Waiting</option><option>Action Required</option><option>Completed</option><option>Closed</option><option>Cancelled</option></select></td></tr>)}</tbody></table></div></section>
  {message&&<div className="notice floatingNotice">{message}</div>}
 </div>
}