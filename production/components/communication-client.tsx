"use client";

import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Channel={id:string;name:string;description:string|null;project_id:string|null;created_at:string};
type Msg={
  id:string;channel_id:string;sender_user_id:string;body:string;created_at:string;
  project_id:string|null;contract_id:string|null;document_id:string|null;work_item_id:string|null;
  recipient_user_id:string|null;message_type:string;client_request_id?:string|null;
};
type Member={user_id:string;display_name:string|null;email:string|null;job_title:string|null;role:string};
type Project={id:string;name:string;code:string;status:string};
type Contract={id:string;project_id:string;contract_number:string|null;title:string;status:string};
type DocumentRow={id:string;project_id:string|null;contract_id:string|null;file_name:string;document_type:string|null;processing_status:string};
type WorkItem={
  id:string;project_id:string|null;contract_id:string|null;document_id:string|null;source_message_id:string|null;
  parent_work_item_id:string|null;title:string;details:string|null;priority:string;assigned_to:string|null;
  assigned_by:string;due_at:string|null;status:string;accepted_at:string|null;completed_at:string|null;
  forwarded_at:string|null;last_overdue_alert_at:string|null;overdue_alert_count:number;created_at:string;updated_at:string;client_request_id?:string|null;
};
type WorkEvent={id:string;work_item_id:string;actor_user_id:string|null;event_type:string;note:string|null;from_user_id:string|null;to_user_id:string|null;created_at:string};

const terminal=new Set(["Completed","Closed","Cancelled"]);

export function CommunicationClient({
  orgId,userId,channels:initial,messages:initialMessages,members,projects,contracts,documents,
  workItems:initialWorkItems,workEvents
}:{
  orgId:string;userId:string;channels:Channel[];messages:Msg[];members:Member[];projects:Project[];
  contracts:Contract[];documents:DocumentRow[];workItems:WorkItem[];workEvents:WorkEvent[];
}){
  const [channels,setChannels]=useState(initial);
  const [messages,setMessages]=useState(initialMessages);
  const [workItems,setWorkItems]=useState(initialWorkItems);
  const [active,setActive]=useState(initial[0]?.id||"");
  const [text,setText]=useState("");
  const [messageType,setMessageType]=useState("Message");
  const [recipient,setRecipient]=useState("");
  const [contextProject,setContextProject]=useState(initial[0]?.project_id||"");
  const [contextContract,setContextContract]=useState("");
  const [contextDocument,setContextDocument]=useState("");
  const [queueView,setQueueView]=useState<"mine"|"assigned"|"all">("mine");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);\n  const messageRequestId=useRef("");\n  const workRequestId=useRef("");

  const names=useMemo(()=>Object.fromEntries(members.map(m=>[m.user_id,m.display_name||m.email||"Team member"])),[members]);
  const activeChannel=channels.find(c=>c.id===active);
  const visible=messages.filter(m=>m.channel_id===active);
  const relevantContracts=contracts.filter(c=>!contextProject||c.project_id===contextProject);
  const relevantDocs=documents.filter(d=>(!contextProject||d.project_id===contextProject)&&(!contextContract||d.contract_id===contextContract));

  const queue=workItems.filter(w=>{
    if(queueView==="mine")return w.assigned_to===userId&&!terminal.has(w.status);
    if(queueView==="assigned")return w.assigned_by===userId&&!terminal.has(w.status);
    return !terminal.has(w.status);
  }).sort((a,b)=>{
    const ad=a.due_at?new Date(a.due_at).getTime():Number.MAX_SAFE_INTEGER;
    const bd=b.due_at?new Date(b.due_at).getTime():Number.MAX_SAFE_INTEGER;
    return ad-bd;
  });

  useEffect(()=>{
    if(activeChannel?.project_id){
      setContextProject(activeChannel.project_id);
      if(contextContract&&!contracts.some(c=>c.id===contextContract&&c.project_id===activeChannel.project_id))setContextContract("");
    }
  },[active,activeChannel?.project_id,contextContract,contracts]);

  useEffect(()=>{
    const s=createClient();if(!s)return;
    const channel=s.channel("workspace-messaging-center")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"organization_id=eq."+orgId},payload=>{
        const row=payload.new as Msg;
        setMessages(x=>x.some(m=>m.id===row.id)?x:[...x,row]);
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"work_items",filter:"organization_id=eq."+orgId},payload=>{
        const row=(payload.new||payload.old) as WorkItem;
        if(payload.eventType==="DELETE"){
          setWorkItems(x=>x.filter(w=>w.id!==row.id));
        }else{
          setWorkItems(x=>[row,...x.filter(w=>w.id!==row.id)]);
        }
      }).subscribe();
    return()=>{s.removeChannel(channel)};
  },[orgId]);

  async function send(e:FormEvent){
    e.preventDefault();
    const body=text.trim();
    if(!body||!active)return;
    if(!messageRequestId.current)messageRequestId.current=crypto.randomUUID();

    const s=createClient();if(!s)return;
    const {error}=await s.from("messages").insert({
      organization_id:orgId,
      channel_id:active,
      sender_user_id:userId,
      body,
      project_id:contextProject||activeChannel?.project_id||null,
      contract_id:contextContract||null,
      document_id:contextDocument||null,
      recipient_user_id:recipient||null,
      message_type:messageType,
      client_request_id:messageRequestId.current
    });
    if(error){
      if(error.code==="23505"){setNotice("This message was already saved.");return}
      setNotice(error.message);return
    }
    messageRequestId.current="";
    setText("");
    setMessageType("Message");
    setRecipient("");
    setNotice("Message sent in governed project context.");
  }

  async function createChannel(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const name=String(f.get("name")||"").trim();
    const projectId=String(f.get("project")||"")||null;
    if(!name)return;
    const s=createClient();if(!s)return;
    const {data,error}=await s.from("channels").insert({
      organization_id:orgId,name,project_id:projectId,created_by:userId
    }).select("id,name,description,project_id,created_at").single();
    if(error){setNotice(error.message);return}
    if(data){
      setChannels([...channels,data as Channel]);
      setActive(data.id);
      e.currentTarget.reset();
    }
  }

  async function createWork(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy)return;
    setBusy(true);setNotice("");

    const f=new FormData(e.currentTarget);
    const title=String(f.get("title")||"").trim();
    const details=String(f.get("details")||"").trim();
    const projectId=String(f.get("project")||"")||null;
    const contractId=String(f.get("contract")||"")||null;
    const documentId=String(f.get("document")||"")||null;
    const assignee=String(f.get("assignee")||"")||null;
    const priority=String(f.get("priority")||"Normal");
    const dueLocal=String(f.get("due")||"");
    const due=dueLocal?new Date(dueLocal).toISOString():null;

    try{
      if(!title)throw new Error("Work title is required.");
      if(!assignee)throw new Error("Assign the work to a team member.");
      if(!projectId)throw new Error("Select the project this work belongs to.");
      if(!workRequestId.current)workRequestId.current=crypto.randomUUID();

      const s=createClient();if(!s)throw new Error("Service unavailable.");
      const {data,error}=await s.from("work_items").insert({
        organization_id:orgId,
        project_id:projectId,
        contract_id:contractId,
        document_id:documentId,
        title,
        details:details||null,
        priority,
        assigned_to:assignee,
        assigned_by:userId,
        due_at:due,
        client_request_id:workRequestId.current
      }).select("*").single();

      if(error){
        if(error.code==="23505")throw new Error("This work request was already saved. Open the existing item instead of creating another.");
        throw error;
      }
      workRequestId.current="";
      setWorkItems(x=>[data as WorkItem,...x.filter(w=>w.id!==data.id)]);

      if(active){
        await s.from("messages").insert({
          organization_id:orgId,
          channel_id:active,
          sender_user_id:userId,
          body:"Assigned work: "+title+(due?" · due "+new Date(due).toLocaleString():""),
          project_id:projectId,
          contract_id:contractId,
          document_id:documentId,
          work_item_id:data.id,
          recipient_user_id:assignee,
          message_type:"Work Request",
          client_request_id:crypto.randomUUID()
        });
      }

      e.currentTarget.reset();
      setNotice("Work assigned. The assignee has been notified; overdue monitoring is active.");
    }catch(error){
      setNotice(error instanceof Error?error.message:"Could not assign work.");
    }finally{
      setBusy(false);
    }
  }

  async function changeStatus(id:string,status:string){
    const s=createClient();if(!s)return;
    const {data,error}=await s.from("work_items").update({status}).eq("id",id).select("*").single();
    if(error){setNotice(error.message);return}
    setWorkItems(x=>[data as WorkItem,...x.filter(w=>w.id!==id)]);
    setNotice("Work status updated.");
  }

  async function forwardWork(id:string,toUser:string){
    if(!toUser)return;
    const item=workItems.find(w=>w.id===id);if(!item)return;
    const s=createClient();if(!s)return;
    const {data,error}=await s.from("work_items").update({assigned_to:toUser}).eq("id",id).select("*").single();
    if(error){setNotice(error.message);return}
    setWorkItems(x=>[data as WorkItem,...x.filter(w=>w.id!==id)]);

    if(active){
      await s.from("messages").insert({
        organization_id:orgId,
        channel_id:active,
        sender_user_id:userId,
        body:"Forwarded work: "+item.title+" → "+(names[toUser]||"team member"),
        project_id:item.project_id,
        contract_id:item.contract_id,
        document_id:item.document_id,
        work_item_id:id,
        recipient_user_id:toUser,
        message_type:"Forward",
        client_request_id:crypto.randomUUID()
      });
    }
    setNotice("Work forwarded and the new owner has been notified.");
  }

  function isOverdue(item:WorkItem){
    return Boolean(item.due_at&&!terminal.has(item.status)&&new Date(item.due_at).getTime()<Date.now());
  }

  return <div className="messagingCenter">
    <aside className="commsChannels">
      <div className="commsTitle">Channels</div>
      {channels.map(c=><button key={c.id} className={active===c.id?"channelBtn active":"channelBtn"} onClick={()=>setActive(c.id)}>
        <span>#</span><div><b>{c.name}</b><small>{c.project_id?projects.find(p=>p.id===c.project_id)?.code:"Organization"}</small></div>
      </button>)}
      <form onSubmit={createChannel} className="newChannel">
        <label>New channel</label>
        <input name="name" placeholder="claims-review"/>
        <select name="project"><option value="">Organization-wide</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
        <button className="btn">Create channel</button>
      </form>
    </aside>

    <section className="commsConversation">
      <div className="conversationTop">
        <div><b>{activeChannel?.name||"Messaging Center"}</b><span>{activeChannel?.description||"Project, contract and document coordination with accountable handoffs."}</span></div>
        <span className="badge good">Live</span>
      </div>

      <div className="messageContextBar">
        <select aria-label="Message project" value={contextProject} onChange={e=>{setContextProject(e.target.value);setContextContract("");setContextDocument("")}}>
          <option value="">Project context</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
        </select>
        <select aria-label="Message contract" value={contextContract} onChange={e=>{setContextContract(e.target.value);setContextDocument("")}}>
          <option value="">Contract context</option>{relevantContracts.map(c=><option key={c.id} value={c.id}>{c.contract_number?c.contract_number+" · ":""}{c.title}</option>)}
        </select>
        <select aria-label="Message document" value={contextDocument} onChange={e=>setContextDocument(e.target.value)}>
          <option value="">Document context</option>{relevantDocs.map(d=><option key={d.id} value={d.id}>{d.file_name}</option>)}
        </select>
      </div>

      <div className="messageStream">
        {visible.length===0?<div className="emptyState">Start the conversation for this channel.</div>:visible.map(m=>{
          const project=projects.find(p=>p.id===m.project_id);
          const contract=contracts.find(c=>c.id===m.contract_id);
          const doc=documents.find(d=>d.id===m.document_id);
          return <div className="messageRow contextual" key={m.id}>
            <div className="avatarCircle small">{(names[m.sender_user_id]||"T").slice(0,1).toUpperCase()}</div>
            <div className="messageBody">
              <div className="messageMeta"><b>{names[m.sender_user_id]||"Team member"}</b><span>{new Date(m.created_at).toLocaleString()}</span></div>
              <div className="messageChips">
                <span>{m.message_type}</span>
                {m.recipient_user_id&&<span>To: {names[m.recipient_user_id]||"Member"}</span>}
                {project&&<span>{project.code}</span>}
                {contract&&<span>{contract.contract_number||contract.title}</span>}
                {doc&&<span>{doc.file_name}</span>}
              </div>
              <p>{m.body}</p>
            </div>
          </div>
        })}
      </div>

      <form className="messageComposer governed" onSubmit={send}>
        <div className="messageComposerMeta">
          <select value={messageType} onChange={e=>setMessageType(e.target.value)} aria-label="Message type">
            <option>Message</option><option>Decision</option><option>Status Update</option><option>Reminder</option><option>Work Request</option>
          </select>
          <select value={recipient} onChange={e=>setRecipient(e.target.value)} aria-label="Direct recipient">
            <option value="">Channel / everyone</option>{members.filter(m=>m.user_id!==userId).map(m=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email}</option>)}
          </select>
        </div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write a project update, decision note or request for action…" maxLength={5000}/>
        <button className="btn primary">Send</button>
      </form>
    </section>

    <aside className="workAssignPanel">
      <div className="workPanelHead"><div><div className="eyebrow">Accountability</div><h2>Assign work</h2></div><span className="badge neutral">Alerts on</span></div>
      <form onSubmit={createWork}>
        <label>Project</label>
        <select name="project" required defaultValue={contextProject}><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
        <label>Contract</label>
        <select name="contract" defaultValue={contextContract}><option value="">No specific contract</option>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_number?c.contract_number+" · ":""}{c.title}</option>)}</select>
        <label>Document</label>
        <select name="document" defaultValue={contextDocument}><option value="">No specific document</option>{documents.map(d=><option key={d.id} value={d.id}>{d.file_name}</option>)}</select>
        <label>Work title</label><input name="title" required placeholder="Review notice entitlement"/>
        <label>Required work</label><textarea name="details" placeholder="What must be checked, produced or decided?"/>
        <div className="formTwo">
          <div><label>Assign to</label><select name="assignee" required defaultValue=""><option value="">Select owner</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email}</option>)}</select></div>
          <div><label>Priority</label><select name="priority" defaultValue="Normal"><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></div>
        </div>
        <label>Due date & time</label><input name="due" type="datetime-local"/>
        <button className="btn primary" style={{width:"100%",marginTop:12}} disabled={busy}>{busy?"Assigning…":"Assign & notify"}</button>
        <div className="workAlertRule">If the item remains open after its due time, ContractGap checks every 15 minutes and sends an overdue alert. Unresolved items can be alerted again after 24 hours.</div>
      </form>
    </aside>

    <section className="card workQueueCard">
      <div className="cardHead">
        <div><h2>Work queue</h2><div className="muted">Accept, progress, complete or formally forward work to another owner.</div></div>
        <div className="queueTabs">
          <button className={queueView==="mine"?"active":""} onClick={()=>setQueueView("mine")}>My work</button>
          <button className={queueView==="assigned"?"active":""} onClick={()=>setQueueView("assigned")}>Assigned by me</button>
          <button className={queueView==="all"?"active":""} onClick={()=>setQueueView("all")}>All open</button>
        </div>
      </div>

      <div className="workQueue">
        {queue.map(item=>{
          const overdue=isOverdue(item);
          const project=projects.find(p=>p.id===item.project_id);
          const contract=contracts.find(c=>c.id===item.contract_id);
          const doc=documents.find(d=>d.id===item.document_id);
          const events=workEvents.filter(e=>e.work_item_id===item.id).slice(0,3);
          return <article key={item.id} className={"workItem "+(overdue?"overdue":"")}>
            <div className="workItemTop">
              <div><span className={"badge "+(item.priority==="Urgent"?"critical":item.priority==="High"?"high":"neutral")}>{item.priority}</span>{overdue&&<span className="badge critical">OVERDUE</span>}</div>
              <span className="workOwner">{names[item.assigned_to||""]||"Unassigned"}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.details||"No additional details."}</p>
            <div className="workContext">
              {project&&<span>{project.code}</span>}
              {contract&&<span>{contract.contract_number||contract.title}</span>}
              {doc&&<span>{doc.file_name}</span>}
              <span>Due: {item.due_at?new Date(item.due_at).toLocaleString():"No deadline"}</span>
              {item.overdue_alert_count>0&&<span>{item.overdue_alert_count} overdue alert{item.overdue_alert_count===1?"":"s"}</span>}
            </div>
            <div className="workControls">
              <select value={item.status} onChange={e=>changeStatus(item.id,e.target.value)} aria-label="Work status">
                <option>Assigned</option><option>Accepted</option><option>In Progress</option><option>Waiting</option><option>Action Required</option><option>Completed</option><option>Closed</option><option>Cancelled</option>
              </select>
              <select defaultValue="" onChange={e=>{if(e.target.value){void forwardWork(item.id,e.target.value);e.currentTarget.value=""}}} aria-label="Forward work">
                <option value="">Forward to…</option>{members.filter(m=>m.user_id!==item.assigned_to).map(m=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email}</option>)}
              </select>
            </div>
            {!!events.length&&<div className="workTimeline">{events.map(e=><span key={e.id}><b>{e.event_type}</b> {e.note||""} · {new Date(e.created_at).toLocaleString()}</span>)}</div>}
          </article>
        })}
        {!queue.length&&<div className="emptyState">No open work in this view.</div>}
      </div>
    </section>

    {notice&&<div className="notice floatingNotice">{notice}</div>}
  </div>
}
