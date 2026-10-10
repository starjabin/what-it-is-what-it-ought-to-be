"use client";

import {FormEvent,useState} from "react";

const markets=[["Global / International","USD"],["Saudi Arabia","SAR"],["United Arab Emirates","AED"],["United Kingdom","GBP"],["United States","USD"],["European Union","EUR"],["Other","USD"]];

export default function Onboarding(){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[market,setMarket]=useState("Global / International"),[currency,setCurrency]=useState("USD");
  function changeMarket(value:string){setMarket(value);setCurrency(markets.find(([m])=>m===value)?.[1]||"USD")}

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;setBusy(true);setMessage("");
    const form=new FormData(e.currentTarget);
    const payload={displayName:String(form.get("displayName")||"").trim(),jobTitle:String(form.get("jobTitle")||"").trim(),organization:String(form.get("organization")||"").trim(),projectName:String(form.get("projectName")||"").trim(),projectCode:String(form.get("projectCode")||"").trim(),market,currency};
    const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),20000);
    try{
      const res=await fetch("/api/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal});
      const data=await res.json().catch(()=>({}));
      if(res.status===401){window.location.href="/sign-in";return}
      if(!res.ok){setMessage(data.error||"Workspace creation failed.");return}
      window.location.href="/team?welcome=1";
    }catch(error){setMessage(error instanceof DOMException&&error.name==="AbortError"?"Workspace creation took too long. Please retry; duplicates are prevented.":"Could not reach the workspace service. Please retry.")}
    finally{window.clearTimeout(timer);setBusy(false)}
  }

  return <main className="onboardingShell">
    <div className="onboardingTop"><div className="marketingBrand"><span className="brandMark">W</span><span>WHAT IT IS<small>WHAT IT OUGHT TO BE</small></span></div><div className="onboardProgress"><span className="done">1 Account</span><span className="active">2 Workspace</span><span>3 Team</span><span>4 Documents</span></div></div>
    <div className="onboardingLayout">
      <section className="onboardingAside"><div className="eyebrow">Guided setup</div><h1>Build the operating workspace around your real project.</h1><p>We’ll create the organization, your owner profile, the first project and the team’s General communication channel together.</p><div className="setupFacts"><div><b>Next: invite your team</b><span>Add contracts, commercial, planning, legal and executive users.</span></div><div><b>Then: bring documents</b><span>Upload contracts, instructions, correspondence and project records privately.</span></div><div><b>Then: assign and act</b><span>Send documents to owners, set due dates and convert findings into tracked actions.</span></div></div></section>
      <section className="onboardingCard"><div className="eyebrow">Step 2 of 4</div><h2>Organization & first project</h2><p className="muted">These defaults can be expanded later. You will be the first organization owner.</p>
        <form onSubmit={submit}>
          <div className="formTwo"><div><label>Your name</label><input name="displayName" placeholder="Aftab Ahmed" required disabled={busy}/></div><div><label>Job title</label><input name="jobTitle" placeholder="Contracts Manager" disabled={busy}/></div></div>
          <label>Organization name</label><input name="organization" placeholder="Mehtab Contracting Company" required disabled={busy}/>
          <div className="formTwo"><div><label>Primary market</label><select value={market} onChange={e=>changeMarket(e.target.value)} disabled={busy}>{markets.map(([m])=><option key={m}>{m}</option>)}</select></div><div><label>Currency</label><select value={currency} onChange={e=>setCurrency(e.target.value)} disabled={busy}><option>USD</option><option>SAR</option><option>AED</option><option>GBP</option><option>EUR</option></select></div></div>
          <div className="formTwo"><div><label>First project</label><input name="projectName" placeholder="Mashrooth-SPCMS-SAAS" required disabled={busy}/></div><div><label>Project code</label><input name="projectCode" placeholder="MSS-01" required disabled={busy}/></div></div>
          <button className="btn primary authButton" type="submit" disabled={busy}>{busy?"Creating secure workspace…":"Create workspace & continue"}</button>
        </form>
        {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
      </section>
    </div>
  </main>
}
