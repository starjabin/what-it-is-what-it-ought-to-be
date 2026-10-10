"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
type Project={id:string;code:string;name:string;market:string;status:string;created_at:string};
export function ProjectsClient({orgId,userId,projects:initial,defaultMarket}:{orgId:string;userId:string;projects:Project[];defaultMarket:string}){
  const [projects,setProjects]=useState(initial),[message,setMessage]=useState("");
  async function createProject(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setMessage("");
    const f=new FormData(e.currentTarget),code=String(f.get("code")||"").trim(),name=String(f.get("name")||"").trim(),market=String(f.get("market")||defaultMarket).trim();
    if(!code||!name)return;
    const s=createClient();if(!s)return;
    const {data,error}=await s.from("projects").insert({organization_id:orgId,code,name,market,status:"Execution",created_by:userId}).select("*").single();
    if(error){setMessage(error.message);return}
    setProjects([data as Project,...projects]);e.currentTarget.reset();setMessage("Project created. Create its contract next.");
  }
  return <div className="coreTwoCol">
    <section className="card"><div className="cardHead"><div><h2>Project portfolio</h2><div className="muted">{projects.length} project{projects.length===1?"":"s"}</div></div><Link className="btn" href="/contracts">Contract master →</Link></div><div className="tableWrap"><table><thead><tr><th>Code</th><th>Project</th><th>Market</th><th>Status</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><b>{p.code}</b></td><td>{p.name}</td><td>{p.market}</td><td><span className="badge good">{p.status}</span></td></tr>)}</tbody></table></div></section>
    <aside className="card"><div className="cardHead"><h2>Create project</h2></div><div className="cardBody"><form onSubmit={createProject}>
      <label htmlFor="project-code">Project code</label><input id="project-code" name="code" required placeholder="MSS-01"/>
      <label htmlFor="project-name">Project name</label><input id="project-name" name="name" required placeholder="Mashrooth-SPCMS-SAAS"/>
      <label htmlFor="project-market">Market</label><input id="project-market" name="market" defaultValue={defaultMarket}/>
      <button className="btn primary" style={{width:"100%",marginTop:14}}>Create project</button>
    </form>{message&&<div className="notice" style={{marginTop:12}}>{message}</div>}</div></aside>
  </div>
}