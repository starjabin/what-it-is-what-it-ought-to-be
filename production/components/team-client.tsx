"use client";
import {FormEvent,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Member={user_id:string;role:string;display_name:string|null;email:string|null;job_title:string|null;created_at:string};
type Invite={id:string;email:string;role:string;job_title:string|null;status:string;expires_at:string;created_at:string;token:string};

export function TeamClient({orgId,currentUserId,role,members:initial,invitations:initialInvites}:{orgId:string;currentUserId:string;role:string;members:Member[];invitations:Invite[]}){
 const [members]=useState(initial),[invites,setInvites]=useState(initialInvites),[message,setMessage]=useState(""),[link,setLink]=useState(""),canInvite=useMemo(()=>["owner","admin"].includes(role),[role]);
 async function invite(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage("");setLink("");
  const f=new FormData(e.currentTarget),email=String(f.get("email")||"").trim().toLowerCase(),inviteRole=String(f.get("role")||"contributor"),jobTitle=String(f.get("jobTitle")||"").trim();
  const supabase=createClient(); if(!supabase){setMessage("Service unavailable.");return}
  const {data,error}=await supabase.from("team_invitations").insert({organization_id:orgId,email,role:inviteRole,job_title:jobTitle||null,invited_by:currentUserId}).select("id,email,role,job_title,status,expires_at,created_at,token").single();
  if(error){setMessage(error.message);return}
  setInvites([data as Invite,...invites]); const url=window.location.origin+"/join/"+data.token; setLink(url); (e.currentTarget as HTMLFormElement).reset();
 }
 async function copy(){if(link){await navigator.clipboard.writeText(link);setMessage("Invite link copied.")}}
 return <div className="teamLayout">
  <section className="card"><div className="cardHead"><div><h2>Organization members</h2><div className="muted">{members.length} active member{members.length===1?"":"s"}</div></div></div><div className="cardBody memberGrid">
   {members.map(m=><div className="memberCard" key={m.user_id}><div className="avatarCircle">{(m.display_name||m.email||"T").slice(0,1).toUpperCase()}</div><div><b>{m.display_name||m.email||"Team member"}</b><span>{m.job_title||"Project team"}</span><small>{m.email||""}</small></div><em>{m.role.replaceAll("_"," ")}</em></div>)}
  </div></section>
  <aside className="card"><div className="cardHead"><h2>Invite team member</h2></div><div className="cardBody">
   {!canInvite?<div className="notice">Only organization owners and admins can invite new members.</div>:<form onSubmit={invite}><label>Work email</label><input name="email" type="email" required placeholder="colleague@company.com"/><label>Role</label><select name="role" defaultValue="contributor"><option value="admin">Admin</option><option value="contract_manager">Contract Manager</option><option value="contributor">Contributor</option><option value="reviewer">Reviewer</option><option value="executive_viewer">Executive Viewer</option><option value="external_viewer">External Viewer</option></select><label>Job title</label><input name="jobTitle" placeholder="Planning Manager"/><button className="btn primary" style={{width:"100%",marginTop:14}}>Create invitation</button></form>}
   {link&&<div className="inviteLink"><small>Share this secure invite link</small><input readOnly value={link}/><button className="btn" onClick={copy}>Copy link</button></div>}
   {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
  </div></aside>
  <section className="card wideCard"><div className="cardHead"><h2>Pending invitations</h2><span className="badge neutral">{invites.filter(i=>i.status==="Pending").length} pending</span></div><div className="tableWrap"><table><thead><tr><th>Email</th><th>Role</th><th>Job title</th><th>Status</th><th>Expires</th></tr></thead><tbody>{invites.map(i=><tr key={i.id}><td><b>{i.email}</b></td><td>{i.role.replaceAll("_"," ")}</td><td>{i.job_title||"—"}</td><td><span className="badge neutral">{i.status}</span></td><td>{new Date(i.expires_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></section>
 </div>
}
