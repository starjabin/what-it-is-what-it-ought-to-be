"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

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
    const emailRedirectTo=window.location.origin+"/auth/callback?next=/onboarding";
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo}});
    setBusy(false);
    if(error){setMessage(error.message);return}
    if(data.session){window.location.href="/onboarding";return}
    setMessage("Account created. Check your email to confirm the address, then return here to sign in and create your workspace.");
  }

  return <main className="hero">
    <div className="formCard">
      <div className="brand">WHAT IT IS / WHAT IT OUGHT TO BE</div>
      <h1 style={{fontSize:32}}>Create account</h1>
      <p className="muted">Start an evidence-led contract intelligence workspace.</p>
      <form onSubmit={submit}>
        <label>Work email</label><input name="email" type="email" autoComplete="email" required/>
        <label>Password</label><input name="password" type="password" autoComplete="new-password" minLength={8} required/>
        <label>Confirm password</label><input name="confirm" type="password" autoComplete="new-password" minLength={8} required/>
        <button className="btn primary" style={{width:"100%",marginTop:16}} type="submit" disabled={busy}>{busy?"Creating account…":"Create account"}</button>
      </form>
      {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
      <div className="footerNote">Already registered? <Link href="/sign-in"><b>Sign in</b></Link> · <Link href="/">Return home</Link></div>
    </div>
  </main>
}
