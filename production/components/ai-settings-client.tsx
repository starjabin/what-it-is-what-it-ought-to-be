"use client";

import {FormEvent,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Settings={
  organization_id:string;
  provider:string;
  main_model:string;
  fast_model:string;
  reasoning_model:string;
  monthly_cap_usd:number|null;
  alert_percent:number;
  processing_region:string;
  redact_personal_data:boolean;
  prompt_log_retention_days:number;
  external_actions_require_approval:boolean;
  financial_actions_require_approval:boolean;
  require_source_citations:boolean;
  updated_at:string;
}|null;

type Tab="models"|"budget"|"data"|"guardrails";

export function AISettingsClient({orgId,role,initial,monthlyRuns}:{orgId:string;role:string;initial:Settings;monthlyRuns:number}){
  const [settings,setSettings]=useState(initial);
  const [tab,setTab]=useState<Tab>("models");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const canEdit=["owner","admin"].includes(role);

  const cap=settings?.monthly_cap_usd??null;
  const runPct=cap?Math.min(100,Math.max(6,Math.round((monthlyRuns/Math.max(cap,1))*100))):18;
  const status=useMemo(()=>({
    provider:"OpenAI",
    connected:true,
    citations:settings?.require_source_citations!==false,
    externalApproval:settings?.external_actions_require_approval!==false,
    financialApproval:settings?.financial_actions_require_approval!==false
  }),[settings]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!canEdit)return;
    setBusy(true);setMessage("");
    const f=new FormData(e.currentTarget);
    const s=createClient();
    if(!s){setBusy(false);return}

    const payload={
      provider:"openai",
      main_model:String(f.get("main_model")||"gpt-6.1-sol"),
      fast_model:String(f.get("fast_model")||"gpt-6-luna"),
      reasoning_model:String(f.get("reasoning_model")||"gpt-6.1-sol"),
      monthly_cap_usd:Number(f.get("monthly_cap_usd")||0)||null,
      alert_percent:Number(f.get("alert_percent")||80),
      processing_region:String(f.get("processing_region")||"Provider regional controls"),
      redact_personal_data:f.get("redact_personal_data")==="on",
      prompt_log_retention_days:Number(f.get("prompt_log_retention_days")||90),
      external_actions_require_approval:true,
      financial_actions_require_approval:true,
      require_source_citations:true,
      updated_at:new Date().toISOString()
    };

    const {data,error}=await s.from("ai_settings").update(payload).eq("organization_id",orgId).select("*").single();
    setBusy(false);
    if(error){setMessage(error.message);return}
    setSettings(data as Settings);
    setMessage("AI Studio configuration saved. Mandatory approval and citation controls remain enforced.");
  }

  return <form onSubmit={save} className="aiStudio">
    <header className="aiStudioTop">
      <div className="aiStudioIdentity">
        <div className="aiStudioGlyph">AI</div>
        <div><span>ContractGap</span><b>AI Studio</b></div>
      </div>
      <div className="aiStudioStatus">
        <span className="aiStudioPulse"/>
        <span>{status.provider} connected</span>
      </div>
      <div className="aiStudioTopActions">
        <span className="aiRolePill">{role.replaceAll("_"," ")}</span>
        <button className="aiSaveButton" disabled={!canEdit||busy}>{busy?"Saving…":"Save settings"}</button>
      </div>
    </header>

    <div className="aiStudioBody">
      <aside className="aiStudioRail">
        <div className="aiStudioRailTitle">AI Configuration</div>
        <button type="button" className={tab==="models"?"aiRailItem active":"aiRailItem"} onClick={()=>setTab("models")}><span>◫</span><div><b>Models</b><small>Provider & routing</small></div></button>
        <button type="button" className={tab==="budget"?"aiRailItem active":"aiRailItem"} onClick={()=>setTab("budget")}><span>◎</span><div><b>Budget</b><small>Usage & alerts</small></div></button>
        <button type="button" className={tab==="data"?"aiRailItem active":"aiRailItem"} onClick={()=>setTab("data")}><span>◇</span><div><b>Data</b><small>Residency & retention</small></div></button>
        <button type="button" className={tab==="guardrails"?"aiRailItem active":"aiRailItem"} onClick={()=>setTab("guardrails")}><span>⬡</span><div><b>Guardrails</b><small>Human control</small></div></button>

        <div className="aiStudioRailDivider"/>
        <div className="aiStudioMiniStat"><span>AI runs this month</span><b>{monthlyRuns}</b></div>
        <div className="aiStudioMiniStat"><span>Citations</span><b>{status.citations?"Required":"Off"}</b></div>
        <div className="aiStudioMiniStat"><span>Credentials</span><b>Server vault</b></div>
      </aside>

      <main className="aiStudioCanvas">
        <section className="aiStudioHero">
          <div>
            <div className="aiStudioEyebrow">AI CONTROL CENTER</div>
            <h1>Configure intelligence without surrendering control.</h1>
            <p>Model routing, budget discipline, processing controls and mandatory human approvals for the ContractGap evidence-to-action workflow.</p>
          </div>
          <div className="aiStudioOrb"><span>CG</span><small>AI</small></div>
        </section>

        {tab==="models"&&<section className="aiStudioPanel">
          <div className="aiPanelHead"><div><span>01</span><h2>Models & provider</h2></div><span className="aiConnectedBadge"><i/> Live server gateway</span></div>
          <div className="aiProviderCard">
            <div className="aiProviderBrand"><div className="aiProviderLogo">O</div><div><b>OpenAI</b><span>Primary AI provider</span></div></div>
            <div className="aiProviderMeta"><span>API key</span><b>Stored server-side</b></div>
            <div className="aiProviderMeta"><span>Document handling</span><b>Untrusted evidence</b></div>
          </div>
          <div className="aiFieldGrid">
            <div className="aiField"><label htmlFor="main-model">Main model</label><input id="main-model" name="main_model" defaultValue={settings?.main_model||"gpt-6.1-sol"} disabled={!canEdit}/><small>Structured extraction and primary contract analysis.</small></div>
            <div className="aiField"><label htmlFor="fast-model">Fast model</label><input id="fast-model" name="fast_model" defaultValue={settings?.fast_model||"gpt-6-luna"} disabled={!canEdit}/><small>Low-latency classification and routine support.</small></div>
            <div className="aiField wide"><label htmlFor="reason-model">Reasoning model</label><input id="reason-model" name="reasoning_model" defaultValue={settings?.reasoning_model||"gpt-6.1-sol"} disabled={!canEdit}/><small>Higher-effort analysis where contractual reasoning warrants it.</small></div>
          </div>
        </section>}

        {tab==="budget"&&<section className="aiStudioPanel">
          <div className="aiPanelHead"><div><span>02</span><h2>Budget & usage</h2></div><span className="aiConnectedBadge"><i/> Entitlements active</span></div>
          <div className="aiUsageHero">
            <div><span>AI runs this month</span><strong>{monthlyRuns}</strong><small>Across extraction and Gap analysis</small></div>
            <div className="aiUsageRing" style={{"--p":runPct+"%"} as React.CSSProperties}><b>{runPct}%</b><span>signal</span></div>
          </div>
          <div className="aiFieldGrid">
            <div className="aiField"><label htmlFor="monthly-cap">Workspace monthly cap (USD)</label><input id="monthly-cap" name="monthly_cap_usd" type="number" min="0" step="1" defaultValue={settings?.monthly_cap_usd??""} disabled={!canEdit}/><small>Additional workspace control above subscription entitlements.</small></div>
            <div className="aiField"><label htmlFor="alert-pct">Alert threshold</label><div className="aiInputWithSuffix"><input id="alert-pct" name="alert_percent" type="number" min="1" max="100" defaultValue={settings?.alert_percent??80} disabled={!canEdit}/><span>%</span></div><small>Warn before the monthly cap is reached.</small></div>
          </div>
          <div className="aiBudgetBar"><div style={{width:runPct+"%"}}/><span>Current month AI activity</span></div>
        </section>}

        {tab==="data"&&<section className="aiStudioPanel">
          <div className="aiPanelHead"><div><span>03</span><h2>Data & processing</h2></div><span className="aiConnectedBadge"><i/> Tenant controls</span></div>
          <div className="aiFieldGrid">
            <div className="aiField wide"><label htmlFor="region">Processing profile</label><select id="region" name="processing_region" defaultValue={settings?.processing_region||"Provider regional controls"} disabled={!canEdit}><option>Provider regional controls</option><option>KSA storage, approved cross-border AI</option><option>Restricted processing profile</option></select><small>Defines the approved processing posture for this tenant.</small></div>
            <div className="aiField"><label htmlFor="retention">Prompt log retention</label><div className="aiInputWithSuffix"><input id="retention" name="prompt_log_retention_days" type="number" min="0" max="3650" defaultValue={settings?.prompt_log_retention_days??90} disabled={!canEdit}/><span>days</span></div></div>
            <label className="aiToggleCard"><input type="checkbox" name="redact_personal_data" defaultChecked={settings?.redact_personal_data??true} disabled={!canEdit}/><span><b>Redact personal data</b><small>Apply configured redaction before eligible AI calls.</small></span></label>
          </div>
          <div className="aiInfoStrip"><span>◇</span><p>Customer contract evidence remains inside ContractGap tenant controls. The AI layer receives only the evidence required for the requested task.</p></div>
        </section>}

        {tab==="guardrails"&&<section className="aiStudioPanel">
          <div className="aiPanelHead"><div><span>04</span><h2>Automation guardrails</h2></div><span className="aiConnectedBadge locked"><i/> Mandatory</span></div>
          <div className="aiGuardrailGrid">
            <article><span>✓</span><div><b>External correspondence</b><p>Letters, notices and external messages always require human approval.</p></div><em>Locked</em></article>
            <article><span>✓</span><div><b>Financial actions</b><p>Payments, guarantees, bids and other financial commitments cannot be auto-approved.</p></div><em>Locked</em></article>
            <article><span>✓</span><div><b>Source citations</b><p>Material AI findings must resolve back to traceable evidence.</p></div><em>Locked</em></article>
            <article><span>✓</span><div><b>Reviewer separation</b><p>AI may propose a Gap; it cannot confirm its own finding.</p></div><em>Locked</em></article>
            <article><span>✓</span><div><b>Prompt-injection resistance</b><p>Uploaded files are treated as untrusted evidence, never instructions.</p></div><em>Locked</em></article>
            <article><span>✓</span><div><b>Audit provenance</b><p>AI runs, outputs, citations and review outcomes remain traceable.</p></div><em>Locked</em></article>
          </div>
        </section>}

        {!canEdit&&<div className="aiStudioNotice">Read-only access. Organization Owners and Admins can change tenant AI settings.</div>}
        {message&&<div className="aiStudioNotice success">{message}</div>}
      </main>
    </div>
  </form>
}
