"use client";

import {FormEvent,useState} from "react";

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

  function changeMarket(value:string){
    setMarket(value);
    setCurrency(markets.find(([m])=>m===value)?.[1]||"USD");
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    setMessage("");

    const form=new FormData(e.currentTarget);
    const payload={
      organization:String(form.get("organization")||"").trim(),
      projectName:String(form.get("projectName")||"").trim(),
      projectCode:String(form.get("projectCode")||"").trim(),
      market,
      currency
    };

    if(!payload.organization||!payload.projectName||!payload.projectCode){
      setBusy(false);
      setMessage("Organization, project name and project code are required.");
      return;
    }

    const controller=new AbortController();
    const timer=window.setTimeout(()=>controller.abort(),20000);

    try{
      const res=await fetch("/api/onboarding",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
        signal:controller.signal
      });
      const data=await res.json().catch(()=>({}));

      if(res.status===401){
        window.location.href="/sign-in";
        return;
      }
      if(!res.ok){
        setMessage(data.error||"Workspace creation failed. Please try again.");
        return;
      }

      window.location.href="/dashboard";
    }catch(error){
      if(error instanceof DOMException&&error.name==="AbortError"){
        setMessage("Workspace creation took too long. Please retry; no duplicate workspace will be created.");
      }else{
        setMessage("Could not reach the workspace service. Please retry.");
      }
    }finally{
      window.clearTimeout(timer);
      setBusy(false);
    }
  }

  return <main className="hero">
    <div className="formCard" style={{width:"min(620px,100%)"}}>
      <div className="brand">FIRST WORKSPACE</div>
      <h1 style={{fontSize:32}}>Set up your organization</h1>
      <p className="muted">Create the tenant and first project. You will be the organization owner.</p>
      <form onSubmit={submit}>
        <label>Organization name</label>
        <input name="organization" placeholder="Example Contracting Company" required disabled={busy}/>
        <div className="formTwo">
          <div><label>Primary market</label><select value={market} onChange={e=>changeMarket(e.target.value)} disabled={busy}>{markets.map(([m])=><option key={m}>{m}</option>)}</select></div>
          <div><label>Currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)} disabled={busy}><option>USD</option><option>SAR</option><option>AED</option><option>GBP</option><option>EUR</option></select></div>
        </div>
        <div className="formTwo">
          <div><label>First project</label><input name="projectName" placeholder="Riyadh Commercial Project" required disabled={busy}/></div>
          <div><label>Project code</label><input name="projectCode" placeholder="RCP-01" required disabled={busy}/></div>
        </div>
        <button className="btn primary" type="submit" style={{width:"100%",marginTop:18}} disabled={busy}>
          {busy?"Creating workspace…":"Create workspace"}
        </button>
      </form>
      {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
    </div>
  </main>
}
