"use client";
import {useLocale} from "./locale-provider";
import {formatNumber} from "../lib/ui/locale";
import {FormEvent,useRef,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Project={id:string;code:string;name:string};
type Contract={id:string;project_id:string;contract_number:string|null;title:string;contract_type:string|null;employer:string|null;contractor:string|null;consultant:string|null;currency:string|null;contract_value:number|null;effective_date:string|null;commencement_date:string|null;completion_date:string|null;governing_law:string|null;status:string;created_at:string};

export function ContractsClient({orgId,userId,projects,contracts:initial}:{orgId:string;userId:string;projects:Project[];contracts:Contract[]}){
  const {t,locale}=useLocale();
  const [contracts,setContracts]=useState(initial),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const requestId=useRef("");
  async function createContract(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;setBusy(true);setMessage("");
    const form=e.currentTarget,f=new FormData(form);
    if(!requestId.current)requestId.current=crypto.randomUUID();
    const payload={
      organization_id:orgId,project_id:String(f.get("project")||""),contract_number:String(f.get("number")||"").trim()||null,
      title:String(f.get("title")||"").trim(),contract_type:String(f.get("type")||"").trim()||null,
      employer:String(f.get("employer")||"").trim()||null,contractor:String(f.get("contractor")||"").trim()||null,
      consultant:String(f.get("consultant")||"").trim()||null,currency:String(f.get("currency")||"SAR"),
      contract_value:Number(String(f.get("value")||"").replaceAll(",",""))||null,
      effective_date:String(f.get("effective")||"")||null,commencement_date:String(f.get("commencement")||"")||null,
      completion_date:String(f.get("completion")||"")||null,governing_law:String(f.get("law")||"").trim()||null,
      status:"Active",created_by:userId,client_request_id:requestId.current
    };
    try{
      if(!payload.project_id||!payload.title)throw new Error("Project and contract title are required.");
      const s=createClient();if(!s)throw new Error("Service unavailable.");
      const {data,error}=await s.from("contracts").insert(payload).select("*").single();
      if(error){
        if(error.code==="23505")throw new Error("This contract is already saved for the selected project. Use the existing contract record.");
        throw error;
      }
      setContracts(x=>[data as Contract,...x.filter(c=>c.id!==data.id)]);
      requestId.current="";
      form.reset();
      setMessage("Contract saved once. Upload controlled documents next.");
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save contract.");}
    finally{setBusy(false)}
  }
  return <div className="coreTwoCol">
    <section className="card"><div className="cardHead"><div><h2>{t("Contract register")}</h2><div className="muted">{formatNumber(locale,contracts.length)} {t("contract records")}</div></div></div><div className="tableWrap" role="region" aria-label="contracts table 1" tabIndex={0}><table><thead><tr><th scope="col">{t("Reference")}</th><th scope="col">{t("Contract")}</th><th scope="col">{t("Project")}</th><th scope="col">{t("Parties")}</th><th scope="col">{t("Dates")}</th><th scope="col">Status</th></tr></thead><tbody>{contracts.map(c=><tr key={c.id}><td><b>{c.contract_number||"—"}</b></td><td><div className="recordTitle">{c.title}</div><div className="meta">{c.contract_type||"Contract"} · {c.currency||"—"} {c.contract_value?formatNumber(locale,c.contract_value):""}</div></td><td>{projects.find(p=>p.id===c.project_id)?.code||"—"}</td><td><div>{c.employer||"—"}</div><div className="meta">{c.contractor||""}{c.consultant?" · "+c.consultant:""}</div></td><td><div>{c.commencement_date||c.effective_date||"—"}</div><div className="meta">{t("Complete")} {c.completion_date||"—"}</div></td><td><span className="badge good">{t(c.status)}</span></td></tr>)}</tbody></table></div>{!contracts.length&&<p className="emptyState">{t("No contracts yet. Select a project to create a contract.")}</p>}</section>
    <aside className="card"><div className="cardHead"><h2>{t("Create contract")}</h2></div><div className="cardBody"><form onSubmit={createContract}>
      <label htmlFor="contract-project">{t("Project")}</label><select id="contract-project" name="project" required><option value="">{t("Select project")}</option>{projects.map(p=><option value={p.id} key={p.id}>{p.code} · {p.name}</option>)}</select>
      <div className="formTwo"><div><label htmlFor="contract-number">{t("Reference")}</label><input id="contract-number" name="number" placeholder="6500004531"/></div><div><label htmlFor="contract-type">{t("Type")}</label><input id="contract-type" name="type" placeholder="FIDIC / EPC / Consultancy"/></div></div>
      <label htmlFor="contract-title">{t("Contract title")}</label><input id="contract-title" name="title" required placeholder="Substation Automation System"/>
      <div className="formTwo"><div><label htmlFor="employer">{t("Employer")}</label><input id="employer" name="employer"/></div><div><label htmlFor="contractor">{t("Contractor")}</label><input id="contractor" name="contractor"/></div></div>
      <label htmlFor="consultant">{t("Engineer / Consultant")}</label><input id="consultant" name="consultant"/>
      <div className="formTwo"><div><label htmlFor="currency">{t("Currency")}</label><select id="currency" name="currency"><option>SAR</option><option>USD</option><option>AED</option><option>EUR</option><option>GBP</option></select></div><div><label htmlFor="contract-value">{t("Contract value")}</label><input id="contract-value" name="value" inputMode="decimal"/></div></div>
      <div className="formTwo"><div><label htmlFor="effective">{t("Effective date")}</label><input id="effective" name="effective" type="date"/></div><div><label htmlFor="commencement">{t("Commencement")}</label><input id="commencement" name="commencement" type="date"/></div></div>
      <div className="formTwo"><div><label htmlFor="completion">{t("Completion")}</label><input id="completion" name="completion" type="date"/></div><div><label htmlFor="law">{t("Governing law")}</label><input id="law" name="law" placeholder="Saudi Arabia"/></div></div>
      <button className="btn primary" style={{width:"100%",marginTop:14}} disabled={busy}>{t(busy?"Saving…":"Save contract once")}</button>
    </form>{message&&<div role="status" aria-live="polite" className="notice" style={{marginTop:12}}>{t(message)}</div>}</div></aside>
  </div>
}
