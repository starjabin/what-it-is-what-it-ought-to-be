"use client";
import {safeReturnPath} from "@/lib/security/safe-return-path";
import {useLocale,LanguageSwitch} from "@/components/locale-provider";

import {FormEvent,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {ChatGPTSignInButton} from "@/components/chatgpt-signin-button";

export default function SignUp(){
  const {t,locale,dir}=useLocale();
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
    const target=safeReturnPath(next,"/onboarding");
    const emailRedirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent(target);
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo}});
    setBusy(false);
    if(error){setMessage(error.message);return}
    if(data.session){window.location.href=target;return}
    setMessage("Account created. Confirm your work email, then sign in to continue onboarding.");
  }

  return <main className="authShell" lang={locale} dir={dir}>
    <section className="authStory">
      <Link href="/" className="marketingBrand lightBrand"><span className="brandMark">W</span><span>{t("WHAT IT IS")}<small>{t("WHAT IT OUGHT TO BE")}</small></span></Link>
      <div className="authStoryCopy">
        <div className="pill darkPill">{t("Start with one project")}</div>
        <h1>{t("Build the evidence-to-action system around your contracts.")}</h1>
        <p>{t("Create your own ContractGap account and workspace first. AI and ChatGPT integrations remain optional supporting services around that controlled record.")}</p>
        <div className="authBenefits"><span>{t("✓ Organization + contract master")}</span><span>{t("✓ Immutable document revisions")}</span><span>{t("✓ Gap Engine + accountable actions")}</span><span>{t("✓ Optional AI assistance")}</span></div>
      </div>
      <div className="authQuote">{t("ContractGap access does not depend on having a ChatGPT subscription.")}</div>
    </section>
    <section className="authFormSide">
      <div className="authFormBox"><LanguageSwitch/>
        <div className="eyebrow">{t("New client")}</div>
        <h2>{t("Create a ContractGap account")}</h2>
        <p className="muted">{t("Use your work email. After confirmation, we’ll guide you through organization, project and contract setup.")}</p>
        <form onSubmit={submit}>
          <label htmlFor="signup-email">{t("Work email")}</label>
          <input id="signup-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required/>
          <label htmlFor="signup-password">{t("Password")}</label>
          <input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Minimum 8 characters" required/>
          <label htmlFor="signup-confirm">{t("Confirm password")}</label>
          <input id="signup-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required/>
          <button className="btn primary authButton" type="submit" disabled={busy}>{t(busy?"Creating account…":"Create account & continue")}</button>
        </form>
        {message&&<div role="status" aria-live="polite" className="notice" style={{marginTop:12}}>{t(message)}</div>}
        <ChatGPTSignInButton next="/onboarding"/>
        <div className="authDivider"><span>Already a customer?</span></div>
        <Link className="btn authButton" href="/sign-in">{t("Sign in")}</Link>
        <div className="footerNote"><Link href="/">{t("← Back to product site")}</Link></div>
      </div>
    </section>
  </main>
}
