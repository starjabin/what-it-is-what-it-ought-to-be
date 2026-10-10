"use client";
import {useState} from "react";
import {createClient} from "@/lib/supabase/client";
export function ChatGPTSignInButton({next="/dashboard"}:{next?:string}){
 const enabled=process.env.NEXT_PUBLIC_CHATGPT_SIGN_IN_ENABLED==="true";
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function continueWithChatGPT(){
  if(!enabled)return;
  setBusy(true);setMessage("");
  const supabase=createClient();if(!supabase){setBusy(false);setMessage("Authentication is not configured.");return}
  const redirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent(next);
  const {error}=await supabase.auth.signInWithOAuth({provider:"custom:chatgpt",options:{redirectTo,scopes:"openid profile email"}});
  if(error){setBusy(false);setMessage(error.message)}
 }
 return <div className="chatgptOnlyAuth">
  <button type="button" className="btn chatgptButton authButton" onClick={continueWithChatGPT} disabled={busy||!enabled}><span className="chatgptMark">◉</span>{busy?"Connecting…":"Continue with ChatGPT"}</button>
  {!enabled&&<div className="notice" style={{marginTop:12}}>ChatGPT sign-in is the only supported login method for this release. Activation is pending OpenAI commercial approval and issued client credentials; no fallback password login is exposed.</div>}
  {message&&<div className="notice" style={{marginTop:10}}>{message}</div>}
  <div className="footerNote">Identity only: ContractGap does not receive your ChatGPT conversations, memory, files or billing history through sign-in.</div>
 </div>
}