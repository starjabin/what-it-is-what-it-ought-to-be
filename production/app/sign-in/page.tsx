"use client";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";

export default function SignIn(){
  const [message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setMessage("");
    const form=new FormData(e.currentTarget);
    const email=String(form.get("email")||"");
    const password=String(form.get("password")||"");
    const supabase=createClient();
    if(!supabase){setMessage("Authentication is not configured.");return}
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMessage(error.message);return}
    window.location.href="/dashboard";
  }

  return <main className="hero">
    <div className="formCard">
      <div className="brand">WHAT IT IS / WHAT IT OUGHT TO BE</div>
      <h1 style={{fontSize:32}}>Sign in</h1>
      <p className="muted">Access your contract intelligence workspace.</p>
      <form onSubmit={submit}>
        <label>Email</label><input name="email" type="email" autoComplete="email" required/>
        <label>Password</label><input name="password" type="password" autoComplete="current-password" required/>
        <button className="btn primary" style={{width:"100%",marginTop:16}} type="submit">Sign in</button>
      </form>
      {message&&<div className="notice" style={{marginTop:12}}>{message}</div>}
      <div className="footerNote">New customer? <Link href="/sign-up"><b>Create an account</b></Link> · <Link href="/">Return home</Link></div>
    </div>
  </main>
}
