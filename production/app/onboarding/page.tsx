"use client";

import {FormEvent,useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

const markets=[
  ["Global / International","USD"],
  ["Saudi Arabia","SAR"],
  ["United Arab Emirates","AED"],
  ["United Kingdom","GBP"],
  ["United States","USD"],
  ["European Union","EUR"],
  ["Other","USD"]
];

export default function Onboarding(){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [market,setMarket]=useState("Global / International");
  const [currency,setCurrency]=useState("USD");

  useEffect(()=>{
    const supabase=createClient();
    if(!supabase)return;
    supabase.auth.getUser().then(async({data})=>{
      if(!data.user){window.location.href="/sign-in";return}
      const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",data.user.id).limit(1).maybeSingle();
      if(membership?.organization_id)window.location.href="/dashboard";
    });
  },[]);

  function changeMarket(value:string){
    setMarket(value);
    setCurrency(markets.find(([m])=>m===value)?.[1]||"USD");
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage("");
    const supabase=createClient();
    if(!supabase){setBusy(false);setMessage("Authentication is not configured.");return}
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user){setBusy(false);window.location.href="/sign-in";return}
    const form=new FormData(e.currentTarget);
    const organization=String(form.get("organization")||"").trim();
    const projectName=String(form.get("projectName")||"").trim();
    const projectCode=String(form.get("projectCode")||"").trim();
    if(!organization||!projectName||!projectCode){setBusy(false);setMessage("Organization, project name and project code are required.");return}

    const {data:org,error:orgError}=await supabase.from("organizations")
      .insert({name:organization,market,currency,created_by:user.id})
      .select("id").single();
    if(orgError||!org){setBusy(false);setMessage(orgError?.message||"Could not create organization.");return}

    const {error:projectError}=await supabase.from("projects").insert({
      organization_id:org.id,
      code:projectCode,
      name:projectName,
      market,
      status:"Execution"
    });
    setBusy(false);
    if(projectError){setMessage("Workspace created, but the first project could not be added: "+projectError.message);return}
    window.location.href="/dashboard";
  }

  return <main className="hero">
    <div className="formCard" style={{width:"min(620px,100%)"}}>
      <div className="brand">FIRST WORKSPACE</div>
      <h1 style={{fontSize:32}}>Set up your organization</h1>
      <p className="muted">Create the tenant and first project. You will be the organization owner.</p>
      <form onSubmit={submit}>
        <label>Organization name</label><input name="organization" placeholder="Example Contracting Company" required/>
        <div className="formTwo">
          <div><label>Primary market</label><select value={market} onChange={e=>changeMarket(e.target.value)}>{markets.map(([m])=><option key={m}>{m}</option>)}</select></div>
          <div><label>Currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)}><option>USD</option><option>SAR</option><option>AED</option><option>GBP</option><option>EUR</option></select></div>
        </div>
        <div className="formTwo">
          <div><label>First project</label><input name="projectName" placeholder="Riyadh Commercial Project" required/></div>
          <div><label>Project code</label><input name="projectCode" placeholder="RCP-01" required/></div>
        </div>
        <button className="btn primary" style={{width:"100%",marginTop:18}} disabled={busy}>{busy?"Creating workspace…":"Create workspace"}</button>
      </form>
      {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
    </div>
  </main>
}
