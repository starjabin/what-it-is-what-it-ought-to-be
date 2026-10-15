"use client";

import {FormEvent,useMemo,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

type Member={user_id:string;role:string;display_name:string|null;email:string|null;job_title:string|null;created_at:string};
type Invite={id:string;email:string;role:string;job_title:string|null;status:string;expires_at:string;created_at:string;token:string};
type Project={id:string;code:string;name:string;status:string};
type Contract={id:string;project_id:string;contract_number:string|null;title:string;status:string};
type ProjectTeam={project_id:string;user_id:string;team_role:string;created_at:string};
type ContractTeam={contract_id:string;user_id:string;team_role:string;created_at:string};
type WorkItem={id:string;assigned_to:string|null;status:string;due_at:string|null;priority:string};

const terminal=new Set(["Completed","Closed","Cancelled"]);

export function TeamClient({
  orgId,currentUserId,role,members:initial,invitations:initialInvites,projects,contracts,
  projectTeam:initialProjectTeam,contractTeam:initialContractTeam,workItems
}:{
  orgId:string;currentUserId:string;role:string;members:Member[];invitations:Invite[];
  projects:Project[];contracts:Contract[];projectTeam:ProjectTeam[];contractTeam:ContractTeam[];workItems:WorkItem[];
}){
  const [members]=useState(initial);
  const [invites,setInvites]=useState(initialInvites);
  const [projectTeam,setProjectTeam]=useState(initialProjectTeam);
  const [contractTeam,setContractTeam]=useState(initialContractTeam);
  const [message,setMessage]=useState("");
  const [link,setLink]=useState("");

  const canInvite=useMemo(()=>["owner","admin"].includes(role),[role]);
  const canCoordinate=useMemo(()=>["owner","admin","contract_manager"].includes(role),[role]);
  const names=useMemo(()=>Object.fromEntries(members.map(m=>[m.user_id,m.display_name||m.email||"Team member"])),[members]);
  const now=Date.now();

  function workStats(userId:string){
    const assigned=workItems.filter(w=>w.assigned_to===userId&&!terminal.has(w.status));
    const overdue=assigned.filter(w=>w.due_at&&new Date(w.due_at).getTime()<now);
    return {open:assigned.length,overdue:overdue.length};
  }

  async function invite(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");setLink("");
    const f=new FormData(e.currentTarget);
    const email=String(f.get("email")||"").trim().toLowerCase();
    const inviteRole=String(f.get("role")||"contributor");
    const jobTitle=String(f.get("jobTitle")||"").trim();

    if(members.some(m=>String(m.email||"").toLowerCase()===email)){setMessage("This person is already a member of the organization.");return}
    if(invites.some(i=>i.status==="Pending"&&i.email.toLowerCase()===email)){setMessage("A pending invitation already exists for this email.");return}

    const supabase=createClient();
    if(!supabase){setMessage("Service unavailable.");return}

    const {data,error}=await supabase.from("team_invitations")
      .insert({organization_id:orgId,email,role:inviteRole,job_title:jobTitle||null,invited_by:currentUserId})
      .select("id,email,role,job_title,status,expires_at,created_at,token").single();

    if(error){setMessage(error.message);return}

    setInvites([data as Invite,...invites]);
    const url=window.location.origin+"/join/"+data.token;
    setLink(url);

    const mail=await fetch("/api/email/team-invitation",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({invitationId:data.id})
    });
    const mailData=await mail.json().catch(()=>({}));
    setMessage(mail.ok?"Invitation created and email queued/sent.":"Invitation created. Email delivery is pending: "+(mailData.error||"share the secure link below."));
    e.currentTarget.reset();
  }

  async function addProjectMember(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    const f=new FormData(e.currentTarget);
    const projectId=String(f.get("project")||"");
    const userId=String(f.get("member")||"");
    const teamRole=String(f.get("teamRole")||"Project Team").trim()||"Project Team";
    if(!projectId||!userId)return;
    const s=createClient();if(!s)return;
    const {data,error}=await s.from("project_team_members")
      .upsert({organization_id:orgId,project_id:projectId,user_id:userId,team_role:teamRole,assigned_by:currentUserId},{onConflict:"project_id,user_id"})
      .select("project_id,user_id,team_role,created_at").single();
    if(error){setMessage(error.message);return}
    setProjectTeam(x=>[data as ProjectTeam,...x.filter(t=>!(t.project_id===projectId&&t.user_id===userId))]);
    setMessage("Project team assignment saved.");
    e.currentTarget.reset();
  }

  async function addContractMember(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    const f=new FormData(e.currentTarget);
    const contractId=String(f.get("contract")||"");
    const userId=String(f.get("member")||"");
    const teamRole=String(f.get("teamRole")||"Contract Team").trim()||"Contract Team";
    if(!contractId||!userId)return;
    const s=createClient();if(!s)return;
    const {data,error}=await s.from("contract_team_members")
      .upsert({organization_id:orgId,contract_id:contractId,user_id:userId,team_role:teamRole,assigned_by:currentUserId},{onConflict:"contract_id,user_id"})
      .select("contract_id,user_id,team_role,created_at").single();
    if(error){setMessage(error.message);return}
    setContractTeam(x=>[data as ContractTeam,...x.filter(t=>!(t.contract_id===contractId&&t.user_id===userId))]);
    setMessage("Contract team assignment saved.");
    e.currentTarget.reset();
  }

  async function removeProjectMember(projectId:string,userId:string){
    const s=createClient();if(!s)return;
    const {error}=await s.from("project_team_members").delete().eq("project_id",projectId).eq("user_id",userId);
    if(error){setMessage(error.message);return}
    setProjectTeam(x=>x.filter(t=>!(t.project_id===projectId&&t.user_id===userId)));
  }

  async function removeContractMember(contractId:string,userId:string){
    const s=createClient();if(!s)return;
    const {error}=await s.from("contract_team_members").delete().eq("contract_id",contractId).eq("user_id",userId);
    if(error){setMessage(error.message);return}
    setContractTeam(x=>x.filter(t=>!(t.contract_id===contractId&&t.user_id===userId)));
  }

  async function copy(){
    if(link){await navigator.clipboard.writeText(link);setMessage("Invite link copied.")}
  }

  return <div className="teamOps">
    <section className="card">
      <div className="cardHead">
        <div><h2>Organization members</h2><div className="muted">{members.length} active member{members.length===1?"":"s"} · workload from Messaging Center</div></div>
        <Link className="btn" href="/communication">Open Messaging Center →</Link>
      </div>
      <div className="cardBody memberGrid">
        {members.map(m=>{
          const stats=workStats(m.user_id);
          return <div className="memberCard accountable" key={m.user_id}>
            <div className="avatarCircle">{(m.display_name||m.email||"T").slice(0,1).toUpperCase()}</div>
            <div className="memberIdentity"><b>{m.display_name||m.email||"Team member"}</b><span>{m.job_title||"Project team"}</span><small>{m.email||""}</small></div>
            <em>{m.role.replaceAll("_"," ")}</em>
            <div className="memberLoad"><span><b>{stats.open}</b> open</span><span className={stats.overdue?"late":""}><b>{stats.overdue}</b> overdue</span></div>
          </div>
        })}
      </div>
    </section>

    <section className="teamAllocationGrid">
      <div className="card">
        <div className="cardHead"><div><h2>Project teams</h2><div className="muted">Who owns coordination at project level</div></div></div>
        <div className="cardBody">
          {canCoordinate&&<form onSubmit={addProjectMember} className="teamAssignForm">
            <select name="project" required defaultValue=""><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
            <select name="member" required defaultValue=""><option value="">Select member</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email}</option>)}</select>
            <input name="teamRole" placeholder="Project role — e.g. Commercial Lead"/>
            <button className="btn primary">Assign to project</button>
          </form>}
          <div className="teamAssignmentList">
            {projectTeam.map(t=><div key={t.project_id+":"+t.user_id} className="teamAssignmentRow">
              <div><b>{names[t.user_id]||"Team member"}</b><span>{projects.find(p=>p.id===t.project_id)?.code||"Project"} · {t.team_role}</span></div>
              {canCoordinate&&<button className="btn ghostSmall" onClick={()=>removeProjectMember(t.project_id,t.user_id)}>Remove</button>}
            </div>)}
            {!projectTeam.length&&<div className="emptyState">No project-specific team assignments yet.</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHead"><div><h2>Contract teams</h2><div className="muted">Reviewers, owners and commercial responsibility by contract</div></div></div>
        <div className="cardBody">
          {canCoordinate&&<form onSubmit={addContractMember} className="teamAssignForm">
            <select name="contract" required defaultValue=""><option value="">Select contract</option>{contracts.map(c=><option key={c.id} value={c.id}>{c.contract_number?c.contract_number+" · ":""}{c.title}</option>)}</select>
            <select name="member" required defaultValue=""><option value="">Select member</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name||m.email}</option>)}</select>
            <input name="teamRole" placeholder="Contract role — e.g. Contract Manager"/>
            <button className="btn primary">Assign to contract</button>
          </form>}
          <div className="teamAssignmentList">
            {contractTeam.map(t=><div key={t.contract_id+":"+t.user_id} className="teamAssignmentRow">
              <div><b>{names[t.user_id]||"Team member"}</b><span>{contracts.find(c=>c.id===t.contract_id)?.contract_number||"Contract"} · {t.team_role}</span></div>
              {canCoordinate&&<button className="btn ghostSmall" onClick={()=>removeContractMember(t.contract_id,t.user_id)}>Remove</button>}
            </div>)}
            {!contractTeam.length&&<div className="emptyState">No contract-specific team assignments yet.</div>}
          </div>
        </div>
      </div>
    </section>

    <section className="teamInviteGrid">
      <aside className="card">
        <div className="cardHead"><h2>Invite team member</h2></div>
        <div className="cardBody">
          {!canInvite?<div className="notice">Only organization owners and admins can invite new organization members.</div>:<form onSubmit={invite}>
            <label>Work email</label><input name="email" type="email" required placeholder="colleague@company.com"/>
            <label>Organization role</label>
            <select name="role" defaultValue="contributor">
              <option value="admin">Admin</option><option value="contract_manager">Contract Manager</option>
              <option value="contributor">Contributor</option><option value="reviewer">Reviewer</option>
              <option value="executive_viewer">Executive Viewer</option><option value="external_viewer">External Viewer</option>
            </select>
            <label>Job title</label><input name="jobTitle" placeholder="Planning Manager"/>
            <button className="btn primary" style={{width:"100%",marginTop:14}}>Create invitation</button>
          </form>}
          {link&&<div className="inviteLink"><small>Share this secure invite link</small><input readOnly value={link}/><button className="btn" onClick={copy}>Copy link</button></div>}
        </div>
      </aside>

      <section className="card">
        <div className="cardHead"><h2>Invitations</h2><span className="badge neutral">{invites.filter(i=>i.status==="Pending").length} pending</span></div>
        <div className="tableWrap">
          <table><thead><tr><th>Email</th><th>Role</th><th>Job title</th><th>Status</th><th>Expires</th></tr></thead>
          <tbody>{invites.map(i=><tr key={i.id}><td><b>{i.email}</b></td><td>{i.role.replaceAll("_"," ")}</td><td>{i.job_title||"—"}</td><td><span className="badge neutral">{i.status}</span></td><td>{new Date(i.expires_at).toLocaleDateString()}</td></tr>)}</tbody></table>
        </div>
      </section>
    </section>

    {message&&<div className="notice floatingNotice">{message}</div>}
  </div>
}
