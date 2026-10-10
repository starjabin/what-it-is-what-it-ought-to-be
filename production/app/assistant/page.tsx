"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";

type Message={role:"user"|"assistant";content:string};

export default function CustomerAssistant(){
  const [messages,setMessages]=useState<Message[]>([
    {role:"assistant",content:"Hello. I can explain What It Is / What It Ought to Be, how the Gap Engine works, who the product is for, and how to start a workspace. I cannot access customer contracts or private tenant data."}
  ]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);

  async function send(e:FormEvent){
    e.preventDefault();
    const text=input.trim();
    if(!text||busy)return;
    const next=[...messages,{role:"user" as const,content:text}];
    setMessages(next);setInput("");setBusy(true);
    try{
      const res=await fetch("/api/customer-assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-8)})});
      const data=await res.json();
      setMessages([...next,{role:"assistant",content:data.answer||data.error||"I could not answer that right now."}]);
    }catch{
      setMessages([...next,{role:"assistant",content:"The assistant is temporarily unavailable. Please try again."}]);
    }finally{setBusy(false)}
  }

  return <main className="assistantPage">
    <div className="assistantPublic">
      <div className="assistantTop">
        <div><div className="brand">WHAT IT IS / WHAT IT OUGHT TO BE</div><h1>Customer Assistant</h1><div className="muted">Product guidance, onboarding and sales support. No access to private contract data.</div></div>
        <div className="actions"><Link className="btn primary" href="/sign-up">Start workspace</Link><Link className="btn" href="/">Home</Link></div>
      </div>
      <div className="chatCard">
        <div className="chatMessages">
          {messages.map((m,i)=><div key={i} className={"chatBubble "+m.role}>{m.content}</div>)}
          {busy&&<div className="chatBubble assistant">Thinking…</div>}
        </div>
        <form className="chatComposer" onSubmit={send}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} placeholder="Ask what the product does, how gaps are managed, or how to get started…" rows={3}/>
          <button className="btn primary" disabled={busy||!input.trim()}>Send</button>
        </form>
      </div>
      <div className="footerNote">This assistant provides product information only. It does not provide legal advice and cannot view tenant evidence or contract records.</div>
    </div>
  </main>
}
