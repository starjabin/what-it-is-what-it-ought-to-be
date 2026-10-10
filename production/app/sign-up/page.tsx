"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {ChatGPTSignInButton} from "@/components/chatgpt-signin-button";

export default function SignUp(){
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage("");
    const form=new FormData(e.currentTarget),email=String(form.get("email")||"").trim(),password=String(form.get("password")||""),confirm=String(form.get("confirm")||"");
    if(password!==confirm){setBusy(false);setMessage("Passwords do not match.");return}
    const supabase=createClient();if(!supabase){setBusy(false);setMessage("Authentication is not configured.");return}
    const next=new URLSearchParams(window.location.search).get("next");
    const target=next&&next.startsWith("/")?next:"/onboarding";
    const emailRedirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent(target);
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo}});
    setBusy(false);
    if(error){setMessage(error.message);return}
    if(data.session){window.location.href=target;return}
    setMessage("Account created. Confirm your work email, then sign in. Your onboarding progress will continue from there.");
  }
  return <main className="authShell">
    <section className="authStory">
      <Link href="/" className="marketingBrand lightBrand"><span className="brandMark">W</span><span>WHAT IT IS<small>WHAT IT OUGHT TO BE</small></span></Link>
      <div className="authStoryCopy"><div className="pill darkPill">Start with one project</div><h1>Build the contract workspace your team can actually operate.</h1><p>Create the organization, invite the team, upload private evidence and start assigning actions from the same workspace.</p><div className="authBenefits"><span>✓ Guided organization setup</span><span>✓ Team invitation workflow</span><span>✓ Private document library</span><span>✓ AI-assisted Gap Engine</span></div></div>
      <div className="authQuote">No payment card is collected during workspace setup.</div>
    </section>
    <section className="authFormSide">
      <div className="authFormBox"><div className="eyebrow">New client</div><h2>Create your account</h2><p className="muted">Use your work email. After confirmation, we’ll guide you through organization, team and document setup.</p>
        <form onSubmit={submit}><label>Work email</label><input name="email" type="email" autoComplete="email" placeholder="you@company.com" required/><label>Password</label><input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Minimum 8 characters" required/><label>Confirm password</label><input name="confirm" type="password" autoComplete="new-password" minLength={8} required/><button className="btn primary authButton" type="submit" disabled={busy}>{busy?"Creating account…":"Create account & continue"}</button></form>
        {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
        <ChatGPTSignInButton next="/onboarding"/>
        <div className="authDivider"><span>Already a customer?</span></div><Link className="btn authButton" href="/sign-in">Sign in</Link><div className="footerNote"><Link href="/">← Back to product site</Link></div>
      </div>
    </section>
  </main>
}
