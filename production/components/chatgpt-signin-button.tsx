"use client";

import {useState} from "react";
import {createClient} from "@/lib/supabase/client";

export function ChatGPTSignInButton({next="/dashboard"}:{next?:string}){
  const enabled=process.env.NEXT_PUBLIC_CHATGPT_SIGN_IN_ENABLED==="true";
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  if(!enabled)return null;

  async function continueWithChatGPT(){
    setBusy(true);setMessage("");
    const supabase=createClient();
    if(!supabase){setBusy(false);setMessage("Authentication is not configured.");return}
    const redirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent(next);
    const {error}=await supabase.auth.signInWithOAuth({
      provider:"custom:chatgpt",
      options:{redirectTo,scopes:"openid profile email"}
    });
    if(error){setBusy(false);setMessage(error.message)}
  }

  return <div className="chatgptAuthBlock">
    <div className="authDivider"><span>or</span></div>
    <button type="button" className="btn chatgptButton authButton" onClick={continueWithChatGPT} disabled={busy}>
      <span className="chatgptMark">◉</span>{busy?"Connecting…":"Continue with ChatGPT"}
    </button>
    {message&&<div className="notice" style={{marginTop:10}}>{message}</div>}
    <div className="footerNote">ChatGPT sign-in shares basic identity only. ContractGap does not receive ChatGPT conversations, memory, files or billing information.</div>
  </div>
}
