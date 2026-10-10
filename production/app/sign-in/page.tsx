"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {ChatGPTSignInButton} from "@/components/chatgpt-signin-button";

export default function SignIn(){
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);setMessage("");
    const form=new FormData(e.currentTarget);
    const email=String(form.get("email")||"").trim();
    const password=String(form.get("password")||"");
    const supabase=createClient();
    if(!supabase){setBusy(false);setMessage("Authentication is not configured.");return}
    const {error}=await supabase.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error){setMessage(error.message);return}
    const next=new URLSearchParams(window.location.search).get("next");
    window.location.href=next&&next.startsWith("/")?next:"/dashboard";
  }

  return <main className="authShell">
    <section className="authStory">
      <Link href="/" className="marketingBrand lightBrand"><span className="brandMark">W</span><span>WHAT IT IS<small>WHAT IT OUGHT TO BE</small></span></Link>
      <div className="authStoryCopy">
        <div className="pill darkPill">Evidence-led contract intelligence</div>
        <h1>Your contract system first. AI where it helps.</h1>
        <p>ContractGap remains the system of record for contracts, evidence, obligations, gaps, actions and audit. ChatGPT is an optional supporting capability—not the foundation of the workspace.</p>
        <div className="authBenefits"><span>✓ Independent ContractGap account</span><span>✓ Tenant-scoped contract evidence</span><span>✓ Human-controlled AI support</span><span>✓ Append-only audit trail</span></div>
      </div>
      <div className="authQuote">Evidence and accountability remain usable whether or not ChatGPT sign-in is connected.</div>
    </section>
    <section className="authFormSide">
      <div className="authFormBox">
        <div className="eyebrow">Secure access</div>
        <h2>Sign in to ContractGap</h2>
        <p className="muted">Use your ContractGap work account. ChatGPT sign-in may be offered as an optional convenience after OpenAI approval.</p>
        <form onSubmit={submit}>
          <label htmlFor="signin-email">Work email</label>
          <input id="signin-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required/>
          <label htmlFor="signin-password">Password</label>
          <input id="signin-password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required/>
          <button className="btn primary authButton" type="submit" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
        </form>
        {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
        <ChatGPTSignInButton next="/dashboard"/>
        <div className="authDivider"><span>New client?</span></div>
        <Link className="btn authButton" href="/sign-up">Create ContractGap account</Link>
        <div className="footerNote"><Link href="/">← Back to product site</Link></div>
      </div>
    </section>
  </main>
}
