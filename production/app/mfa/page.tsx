"use client";
import {useEffect,useState,useRef} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {safeReturnPath} from "@/lib/security/safe-return-path";
export default function MFA(){
 const [factor,setFactor]=useState(""),[secret,setSecret]=useState(""),[code,setCode]=useState(""),[status,setStatus]=useState("Checking verified session…"),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const started=useRef(false);
 const go=()=>{window.location.assign(safeReturnPath(new URLSearchParams(location.search).get("next")))};
 useEffect(()=>{if(started.current)return;started.current=true;void(async()=>{
 const s=createClient();if(!s){setStatus("Dedicated staging authentication is not configured.");return}
 try{const {data,error}=await s.auth.getClaims();if(error||!data?.claims){setStatus("Sign in before setting up MFA.");return}if(data.claims.aal==="aal2"){go();return}
 const factors=await s.auth.mfa.listFactors();if(factors.error)throw factors.error;const active=factors.data.totp.find(f=>f.status==="verified");if(active){setFactor(active.id);setStatus("Enter your authenticator code.")}else{setStatus("Enroll a TOTP authenticator before accessing project data.")}setReady(true)
 }catch{setStatus("Unable to verify your authentication session.")}})()},[]);
 async function enroll(){if(busy||!ready)return;setBusy(true);try{const s=createClient();if(!s)throw Error();const r=await s.auth.mfa.enroll({factorType:"totp",friendlyName:"GAP CONTROLS"});if(r.error)throw r.error;setFactor(r.data.id);setSecret(r.data.totp.secret);setStatus("Add the setup key to your authenticator, then enter the current six-digit code.")}catch{setStatus("Enrollment failed. Ask your staging administrator to check your factors.")}finally{setBusy(false)}}
 async function verify(e:React.FormEvent){e.preventDefault();if(busy||!factor||!/^\d{6}$/.test(code))return;setBusy(true);try{const s=createClient();if(!s)throw Error();const r=await s.auth.mfa.challengeAndVerify({factorId:factor,code});if(r.error)throw r.error;const claims=await s.auth.getClaims();if(claims.error||claims.data?.claims.aal!=="aal2")throw Error();setSecret("");setCode("");go()}catch{setStatus("Verification failed. Enter a fresh code.")}finally{setBusy(false)}}
 return <main className="gapPage"><section className="card gapPanel" style={{maxWidth:560,margin:"auto"}}><div className="eyebrow">Identity assurance</div><h1>Multi-factor authentication</h1><p>Access to contract records requires an authenticated AAL2 session.</p><p role="status" aria-live="polite">{status}</p>{ready&&!factor&&<button className="btn primary" disabled={busy} onClick={()=>void enroll()}>Enroll authenticator</button>}{secret&&<div className="gapNotice"><p>Authenticator setup key — do not share or save in chat.</p><code style={{overflowWrap:"anywhere"}}>{secret}</code></div>}{factor&&<form className="gapForm" onSubmit={verify}><label htmlFor="mfa-code">Six-digit code</label><input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)}/><button className="btn primary" disabled={busy} type="submit">Verify authenticator</button></form>}<p><Link href="/sign-in">Return to sign-in</Link></p></section></main>
}
