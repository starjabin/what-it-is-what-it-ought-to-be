
"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";

type RecordLink={label:string;meta?:string;href?:string};
type Message={role:"user"|"assistant";content:string;records?:RecordLink[];scope?:string};

const examples=[
  "Give me a workspace summary",
  "Show overdue actions",
  "Show high-risk gaps",
  "Which documents failed processing?",
  "Show open obligations",
  "Who is on the team?",
  "Show unread notifications",
  "What plan are we on?"
];

export function InternalAssistantClient(){
  const [messages,setMessages]=useState<Message[]>([
    {role:"assistant",content:"I am the Internal Database Assistant. I only read records available to your signed-in workspace. I do not call an AI model, interpret contracts, or invent missing information."}
  ]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);

  async function ask(text:string){
    const query=text.trim();
    if(!query||busy)return;
    const next=[...messages,{role:"user" as const,content:query}];
    setMessages(next);setInput("");setBusy(true);
    try{
      const response=await fetch("/api/internal-assistant",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({query})
      });
      const data=await response.json();
      if(!response.ok){
        setMessages([...next,{role:"assistant",content:data.error||"The database request could not be completed."}]);
        return;
      }
      setMessages([...next,{
        role:"assistant",
        content:data.answer,
        records:Array.isArray(data.records)?data.records:[],
        scope:data.scope
      }]);
    }catch{
      setMessages([...next,{role:"assistant",content:"The database request could not be completed. No AI fallback was used."}]);
    }finally{
      setBusy(false);
    }
  }

  async function submit(e:FormEvent){
    e.preventDefault();
    await ask(input);
  }

  return <div className="internalAssistantLayout">
    <section className="internalAssistantIntro">
      <div className="eyebrow">DATABASE-ONLY ASSISTANT</div>
      <h1>Ask your workspace records.</h1>
      <p>Fast access to ContractGap data without sending the question or the answer to an AI provider. Results remain tenant-scoped by your authenticated database permissions.</p>
      <div className="databaseOnlyBadge"><span>DB</span><div><b>No AI model</b><small>Supabase records only</small></div></div>
      <div className="assistantExamples">
        {examples.map(example=><button type="button" key={example} onClick={()=>void ask(example)} disabled={busy}>{example}</button>)}
      </div>
      <div className="assistantDataPolicy">
        <b>What it will not do</b>
        <span>It will not interpret clauses, give legal advice, generate entitlement positions, or fill missing records. Use the AI Analyst separately only when you intentionally want AI-supported analysis.</span>
      </div>
    </section>

    <section className="internalAssistantCard">
      <div className="internalAssistantHead">
        <div><b>Internal Assistant</b><span>Live workspace database</span></div>
        <span className="databaseLive"><i/> DATABASE ONLY</span>
      </div>
      <div className="internalMessages">
        {messages.map((m,i)=><div key={i} className={"internalMessage "+m.role}>
          <div className="internalMessageRole">{m.role==="user"?"YOU":"DATABASE"}</div>
          <div className="internalMessageBody">{m.content}</div>
          {m.scope&&<div className="internalMessageScope">Scope: {m.scope}</div>}
          {!!m.records?.length&&<div className="internalRecordList">
            {m.records.map((r,j)=>r.href
              ? <Link href={r.href} key={j} className="internalRecord"><b>{r.label}</b>{r.meta&&<span>{r.meta}</span>}</Link>
              : <div key={j} className="internalRecord"><b>{r.label}</b>{r.meta&&<span>{r.meta}</span>}</div>
            )}
          </div>}
        </div>)}
        {busy&&<div className="internalMessage assistant"><div className="internalMessageRole">DATABASE</div><div className="internalMessageBody">Reading workspace records…</div></div>}
      </div>
      <form className="internalComposer" onSubmit={submit}>
        <textarea value={input} onChange={e=>setInput(e.target.value)} maxLength={500} rows={3} placeholder="Ask about projects, contracts, documents, obligations, gaps, actions, deadlines, team, notifications, billing, audit or reports…"/>
        <button className="btn primary" disabled={busy||!input.trim()}>Query database</button>
      </form>
      <div className="internalAssistantFoot">Every answer on this screen is derived from stored workspace records. No OpenAI or other AI model is called.</div>
    </section>
  </div>
}
