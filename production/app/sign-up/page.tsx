"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {ChatGPTSignInButton} from "@/components/chatgpt-signin-button";

export default function SignUp(){
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);setMessage("");
    const form=new FormData(e.currentTarget);
    const email=String(form.get("email")||"").trim();
    const password=String(form.get("password")||"");
    const confirm=String(form.get("confirm")||"");
    if(password!==confirm){setBusy(false);setMessage("Passwords do not match.");return}
    const supabase=createClient();
    if(!supabase){setBusy(false);setMessage("Authentication is not configured.");return}
    const next=new URLSearchParams(window.location.search).get("next");
    const target=next&&next.startsWith("/")?next:"/onboarding";
    const emailRedirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent(target);
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo}});
    setBusy(false);
    if(error){setMessage(error.message);return}
    if(data.session){window.location.href=target;return}
    setMessage("Account created. Confirm your work email, then sign in to continue onboarding.");
  }

  return <main className="authShell">
    <section className="authStory">
      <Link href="/" className="marketingBrand lightBrand"><span className="brandMark">W</span><span>WHAT IT IS<small>WHAT IT OUGHT TO BE</small></span></Link>
      <div className="authStoryCopy">
        <div className="pill darkPill">Start with one project</div>
        <h1>Build the evidence-to-action system around your contracts.</h1>
        <p>Create your own ContractGap account and workspace first. AI and ChatGPT integrations remain optional supporting services around that controlled record.</p>
        <div className="authBenefits"><span>✓ Organization + contract master</span><span>✓ Immutable document revisions</span><span>✓ Gap Engine + accountable actions</span><span>✓ Optional AI assistance</span></div>
      </div>
      <div className="authQuote">ContractGap access does not depend on having a ChatGPT subscription.</div>
    </section>
    <section className="authFormSide">
      <div className="authFormBox">
        <div className="eyebrow">New client</div>
        <h2>Create a ContractGap account</h2>
        <p className="muted">Use your work email. After confirmation, we’ll guide you through organization, project and contract setup.</p>
        <form onSubmit={submit}>
          <label htmlFor="signup-email">Work email</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required/>
          <label htmlFor="signup-password">Password</label>
          <input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Minimum 8 characters" required/>
          <label htmlFor="signup-confirm">Confirm password</label>
          <input id="signup-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required/>
          <button className="btn primary authButton" type="submit" disabled={busy}>{busy?"Creating account…":"Create account & continue"}</button>
        </form>
        {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
        <ChatGPTSignInButton next="/onboarding"/>
        <div className="authDivider"><span>Already a customer?</span></div>
        <Link className="btn authButton" href="/sign-in">Sign in</Link>
        <div className="footerNote"><Link href="/">← Back to product site</Link></div>
      </div>
    </section>
  </main>
}
