"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

export default function SignIn(){
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage("");
    const form=new FormData(e.currentTarget);
    const email=String(form.get("email")||"");
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
      <div className="authStoryCopy"><div className="pill darkPill">Evidence-led contract intelligence</div><h1>Return to the position that matters.</h1><p>Contracts, documents, team communication, gaps and actions stay connected in one accountable workspace.</p><div className="authBenefits"><span>✓ Private tenant workspace</span><span>✓ Evidence-linked Gap Engine</span><span>✓ Team and document accountability</span><span>✓ Human-controlled AI analysis</span></div></div>
      <div className="authQuote">“Know the position. See the gap. Protect the outcome.”</div>
    </section>
    <section className="authFormSide">
      <div className="authFormBox"><div className="eyebrow">Welcome back</div><h2>Sign in to your workspace</h2><p className="muted">Continue managing your contractual position and team actions.</p>
        <form onSubmit={submit}><label>Work email</label><input name="email" type="email" autoComplete="email" placeholder="you@company.com" required/><label>Password</label><input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required/><button className="btn primary authButton" type="submit" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form>
        {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
        <div className="authDivider"><span>New to the platform?</span></div>
        <Link className="btn authButton" href="/sign-up">Create a new workspace</Link>
        <div className="footerNote"><Link href="/">← Back to product site</Link></div>
      </div>
    </section>
  </main>
}
