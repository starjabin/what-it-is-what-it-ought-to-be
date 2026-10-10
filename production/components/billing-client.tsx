"use client";
import {useMemo,useState} from "react";

type Plan={code:string;name:string;description:string|null;monthly_amount_minor:number|null;currency:string;seats_limit:number|null;projects_limit:number|null;ai_runs_monthly_limit:number|null;storage_gb_limit:number|null;features:unknown};
type Account={plan_code:string;status:string;trial_ends_at:string|null;current_period_end:string|null;cancel_at_period_end:boolean;provider_customer_id:string|null;provider_subscription_id:string|null}|null;

export function BillingClient({account,plans,usage}:{orgId:string;email:string;account:Account;plans:Plan[];usage:{ai:number;members:number;projects:number}}){
 const [message,setMessage]=useState("");
 const current=useMemo(()=>plans.find(p=>p.code===account?.plan_code),[plans,account]);
 const days=account?.trial_ends_at?Math.max(0,Math.ceil((new Date(account.trial_ends_at).getTime()-Date.now())/86400000)):null;
 function meter(label:string,value:number,limit:number|null){
   const pct=limit?Math.min(100,Math.round(value/limit*100)):0;
   return <div className="usageRow"><div><b>{label}</b><span>{value} / {limit??"Unlimited"}</span></div>{limit!==null&&<div className="usageBar"><i style={{width:pct+"%"}}/></div>}</div>
 }
 function choose(planCode:string){
   setMessage(planCode==="enterprise"
     ?"Enterprise onboarding is handled by the sales team. Use the Customer Assistant to start the conversation."
     :"Online Paddle checkout is being activated. Your 14-day trial and plan controls are already live; no card is required during the trial.");
 }
 return <div>
  <section className="billingHero card"><div><div className="eyebrow">Current subscription</div><h2>{current?.name||account?.plan_code||"Trial"}</h2><p className="muted">{account?.status==="trialing"&&days!==null?days+" days remaining in your trial.":account?.status==="active"?"Your subscription is active.":"Subscription status: "+(account?.status||"trialing")}</p></div><span className={"badge "+(account?.status==="active"?"good":"medium")}>{account?.status||"trialing"}</span></section>
  <div className="billingUsage card"><div className="cardHead"><h2>Current usage</h2><span className="badge neutral">This billing month</span></div><div className="cardBody usageGrid">{meter("Team members",usage.members,current?.seats_limit??null)}{meter("Projects",usage.projects,current?.projects_limit??null)}{meter("AI analyses",usage.ai,current?.ai_runs_monthly_limit??null)}{meter("Document storage (GB)",0,current?.storage_gb_limit??null)}</div></div>
  <div className="pricingGrid workspacePricing">{plans.map(p=><article key={p.code} className={"pricingCard "+(p.code===account?.plan_code?"currentPlan":"")}><span className="badge neutral">{p.name}</span><h3>{p.description}</h3><div className="marketingPrice"><b>{p.monthly_amount_minor===null?"Custom":p.currency+" "+new Intl.NumberFormat().format(p.monthly_amount_minor/100)}</b><span>{p.monthly_amount_minor===null?"annual":"/ month"}</span></div><div className="planLimits"><span>{p.seats_limit??"Unlimited"} users</span><span>{p.projects_limit??"Unlimited"} projects</span><span>{p.ai_runs_monthly_limit??"Unlimited"} AI analyses/month</span><span>{p.storage_gb_limit??"Unlimited"} GB documents</span></div>{p.code===account?.plan_code?<button className="btn" disabled>Current plan</button>:<button className="btn primary" onClick={()=>choose(p.code)}>{p.code==="enterprise"?"Contact sales":"Choose "+p.name}</button>}</article>)}</div>
  {message&&<div className="notice" style={{marginTop:14}}>{message}</div>}
 </div>
}
