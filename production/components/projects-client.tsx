"use client";
import {FormEvent,useRef,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
type Project={id:string;code:string;name:string;market:string;status:string;created_at:string};
export function ProjectsClient({orgId,userId,projects:initial,defaultMarket}:{orgId:string;userId:string;projects:Project[];defaultMarket:string}){
  const [projects,setProjects]=useState(initial),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const requestId=useRef("");
  async function createProject(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;setBusy(true);setMessage("");
    const form=e.currentTarget,f=new FormData(form),code=String(f.get("code")||"").trim(),name=String(f.get("name")||"").trim(),market=String(f.get("market")||defaultMarket).trim();
    try{
      if(!code||!name)throw new Error("Project code and name are required.");
      if(!requestId.current)requestId.current=crypto.randomUUID();
      const s=createClient();if(!s)throw new Error("Service unavailable.");
      const {data,error}=await s.from("projects").insert({organization_id:orgId,code,name,market,status:"Execution",created_by:userId,client_request_id:requestId.current}).select("*").single();
      if(error){
        if(error.code==="23505")throw new Error("This project is already saved. Use the existing project instead of creating another.");
        throw error;
      }
      setProjects(x=>[data as Project,...x.filter(p=>p.id!==data.id)]);
      requestId.current="";
      form.reset();
      setMessage("Project saved once. Continue to its contract.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save project.");}
    finally{setBusy(false)}
  }
  return <div className="coreTwoCol">
    <section className="card"><div className="cardHead"><div><h2>Project portfolio</h2><div className="muted">{projects.length} project{projects.length===1?"":"s"}</div></div><Link className="btn" href="/contracts">Contract master →</Link></div><div className="tableWrap"><table><thead><tr><th>Code</th><th>Project</th><th>Market</th><th>Status</th></tr></thead><tbody>{projects.map(p=><tr key={p.id}><td><b>{p.code}</b></td><td>{p.name}</td><td>{p.market}</td><td><span className="badge good">{p.status}</span></td></tr>)}</tbody></table></div></section>
    <aside className="card"><div className="cardHead"><h2>Create project</h2></div><div className="cardBody"><form onSubmit={createProject}>
      <label htmlFor="project-code">Project code</label><input id="project-code" name="code" required placeholder="MSS-01"/>
      <label htmlFor="project-name">Project name</label><input id="project-name" name="name" required placeholder="Mashrooth-SPCMS-SAAS"/>
      <label htmlFor="project-market">Market</label><input id="project-market" name="market" defaultValue={defaultMarket}/>
      <button className="btn primary" style={{width:"100%",marginTop:14}} disabled={busy}>{busy?"Saving…":"Save project once"}</button>
    </form>{message&&<div className="notice" style={{marginTop:12}}>{message}</div>}</div></aside>
  </div>
}