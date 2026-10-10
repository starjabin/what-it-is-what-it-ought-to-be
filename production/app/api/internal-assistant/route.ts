
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const runtime="nodejs";

type RecordLink={label:string;meta?:string;href?:string};

const isoDate=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString("en-GB"):"—";
const money=(value:number|null|undefined,currency:string|null|undefined)=>{
  if(value===null||value===undefined)return "—";
  return new Intl.NumberFormat("en",{maximumFractionDigits:0}).format(Number(value))+" "+(currency||"");
};
const has=(q:string,...words:string[])=>words.some(w=>q.includes(w));
const cleanSearch=(q:string)=>q.replace(/[^\p{L}\p{N}\s._-]/gu," ").replace(/\s+/g," ").trim().slice(0,120);
const ok=(answer:string,scope:string,records:RecordLink[]=[])=>
  NextResponse.json({answer,records,scope,source:"database_only" as const});

export async function POST(request:Request){
  const supabase=await createClient();
  if(!supabase)return NextResponse.json({error:"Database service is unavailable."},{status:503});

  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});

  const userId=String(claims.claims.sub);
  const {data:membership}=await supabase.from("organization_members")
    .select("organization_id,role,display_name")
    .eq("user_id",userId).limit(1).maybeSingle();

  if(!membership?.organization_id)return NextResponse.json({error:"Workspace membership is required."},{status:403});
  const orgId=membership.organization_id;

  const body=await request.json().catch(()=>null) as {query?:string}|null;
  const query=String(body?.query||"").trim().slice(0,500);
  if(!query)return NextResponse.json({error:"Enter a database question."},{status:400});
  const q=query.toLowerCase();

  if(has(q,"summary","overview","dashboard","workspace status","how are we doing")){
    const [projects,contracts,documents,obligations,gaps,actions,members,notifications]=await Promise.all([
      supabase.from("projects").select("id",{count:"exact",head:true}).eq("organization_id",orgId),
      supabase.from("contracts").select("id",{count:"exact",head:true}).eq("organization_id",orgId),
      supabase.from("documents").select("id,processing_status").eq("organization_id",orgId),
      supabase.from("obligations").select("id,status").eq("organization_id",orgId),
      supabase.from("gaps").select("id,severity,status").eq("organization_id",orgId),
      supabase.from("actions").select("id,status,due_at").eq("organization_id",orgId),
      supabase.from("organization_members").select("user_id",{count:"exact",head:true}).eq("organization_id",orgId),
      supabase.from("notifications").select("id,read_at").eq("organization_id",orgId).or("user_id.is.null,user_id.eq."+userId)
    ]);
    const material=(gaps.data||[]).filter(g=>["Critical","High"].includes(String(g.severity))&&!["Closed","Rejected","Not Applicable"].includes(String(g.status))).length;
    const openActions=(actions.data||[]).filter(a=>!["Done","Closed","Completed"].includes(String(a.status))).length;
    const failedDocs=(documents.data||[]).filter(d=>String(d.processing_status)==="failed").length;
    const openObligations=(obligations.data||[]).filter(o=>String(o.status)==="Open").length;
    const unread=(notifications.data||[]).filter(n=>!n.read_at).length;
    return ok(
      "Database summary: "+(projects.count||0)+" projects, "+(contracts.count||0)+" contracts, "+(documents.data?.length||0)+" documents, "+openObligations+" open obligations, "+material+" Critical/High active gaps, "+openActions+" open actions, "+(members.count||0)+" team members, "+unread+" unread notifications, and "+failedDocs+" failed documents.",
      "workspace summary"
    );
  }

  if(has(q,"project","projects")){
    const {data}=await supabase.from("projects").select("id,code,name,market,status,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(30);
    const rows=data||[];
    return ok(
      rows.length?"The database contains "+rows.length+" project record"+(rows.length===1?"":"s")+" in this result.":"No project records were found in this workspace.",
      "projects",
      rows.map(p=>({label:p.code+" · "+p.name,meta:p.market+" · "+p.status,href:"/projects"}))
    );
  }

  if(has(q,"contract","contracts")){
    const {data}=await supabase.from("contracts").select("id,contract_number,title,contract_type,currency,contract_value,status,commencement_date,completion_date").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(30);
    const rows=data||[];
    return ok(
      rows.length?"The database contains "+rows.length+" contract record"+(rows.length===1?"":"s")+" in this result.":"No contract records were found in this workspace.",
      "contracts",
      rows.map(c=>({label:(c.contract_number||"No reference")+" · "+c.title,meta:(c.contract_type||"Contract")+" · "+c.status+" · "+money(c.contract_value,c.currency)+" · "+isoDate(c.commencement_date)+" → "+isoDate(c.completion_date),href:"/contracts"}))
    );
  }

  if(has(q,"document","documents","file","files","processing")){
    let rq=supabase.from("documents").select("id,file_name,document_type,processing_status,version_no,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(40);
    if(has(q,"fail","failed","error"))rq=rq.eq("processing_status","failed");
    if(has(q,"queued","queue"))rq=rq.eq("processing_status","queued");
    const {data}=await rq;
    const rows=data||[];
    return ok(
      rows.length?"Found "+rows.length+" document record"+(rows.length===1?"":"s")+" matching this request.":"No matching document records were found.",
      "documents",
      rows.map(d=>({label:d.file_name,meta:(d.document_type||"Unclassified")+" · v"+d.version_no+" · "+d.processing_status,href:"/documents"}))
    );
  }

  if(has(q,"obligation","obligations","ought","clause requirement")){
    let rq=supabase.from("obligations").select("id,responsible_party,beneficiary_party,obligation_text,timing_requirement,source_locator,status,confidence").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(40);
    if(has(q,"open","outstanding"))rq=rq.eq("status","Open");
    if(has(q,"breach","breached"))rq=rq.in("status",["Potential Breach","Breached"]);
    const {data}=await rq;
    const rows=data||[];
    return ok(
      rows.length?"Found "+rows.length+" obligation record"+(rows.length===1?"":"s")+" matching this request.":"No matching obligation records were found.",
      "obligations",
      rows.map(o=>({label:o.obligation_text,meta:(o.responsible_party||"Unspecified party")+" · "+(o.timing_requirement||"No timing stored")+" · "+o.status+" · "+o.source_locator,href:"/obligations"}))
    );
  }

  if(has(q,"evidence","source","sources","citation","citations")){
    const {data}=await supabase.from("evidence").select("id,source_type,source_locator,excerpt,evidence_kind,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(40);
    const rows=data||[];
    return ok(
      rows.length?"Found "+rows.length+" evidence record"+(rows.length===1?"":"s")+" in the latest result.":"No evidence records were found.",
      "evidence",
      rows.map(e=>({label:e.source_type+" · "+e.source_locator,meta:e.evidence_kind+" · "+String(e.excerpt||"").slice(0,180),href:"/evidence"}))
    );
  }

  if(has(q,"gap","gaps","risk","risks","issue","issues")){
    let rq=supabase.from("gaps").select("id,gap,impact,action,severity,status,confidence,owner_label,deadline").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(40);
    if(has(q,"critical"))rq=rq.eq("severity","Critical");
    else if(has(q,"high"))rq=rq.eq("severity","High");
    const {data}=await rq;
    const rows=data||[];
    return ok(
      rows.length?"Found "+rows.length+" Gap record"+(rows.length===1?"":"s")+" matching this request.":"No matching Gap records were found.",
      "gaps",
      rows.map(g=>({label:g.severity+" · "+g.gap,meta:g.status+" · owner "+(g.owner_label||"Unassigned")+" · due "+isoDate(g.deadline)+" · impact: "+String(g.impact).slice(0,150),href:"/gaps/"+g.id}))
    );
  }

  if(has(q,"action","actions","deadline","deadlines","due","overdue")){
    const today=new Date().toISOString().slice(0,10);
    const {data}=await supabase.from("actions").select("id,gap_id,action_text,owner_label,due_at,status,completion_evidence").eq("organization_id",orgId).order("due_at",{ascending:true}).limit(60);
    let rows=data||[];
    if(has(q,"overdue"))rows=rows.filter(a=>a.due_at&&a.due_at<today&&!["Done","Closed","Completed"].includes(String(a.status)));
    else if(has(q,"open","outstanding"))rows=rows.filter(a=>!["Done","Closed","Completed"].includes(String(a.status)));
    return ok(
      rows.length?"Found "+rows.length+" action/deadline record"+(rows.length===1?"":"s")+" matching this request.":"No matching action or deadline records were found.",
      "actions and deadlines",
      rows.slice(0,40).map(a=>({label:a.action_text,meta:(a.owner_label||"Unassigned")+" · due "+isoDate(a.due_at)+" · "+a.status,href:a.gap_id?"/gaps/"+a.gap_id:"/actions"}))
    );
  }

  if(has(q,"team","member","members","people","owner","owners")){
    const {data}=await supabase.from("organization_members").select("user_id,display_name,email,job_title,role,created_at").eq("organization_id",orgId).order("created_at").limit(60);
    const rows=data||[];
    return ok(
      rows.length?"The database contains "+rows.length+" team member record"+(rows.length===1?"":"s")+".":"No team member records were found.",
      "team",
      rows.map(m=>({label:m.display_name||m.email||"Team member",meta:(m.job_title||"No title")+" · "+String(m.role).replaceAll("_"," ")+" · "+(m.email||"No email"),href:"/team"}))
    );
  }

  if(has(q,"notification","notifications","unread","attention")){
    const {data}=await supabase.from("notifications").select("id,kind,title,body,href,read_at,created_at").eq("organization_id",orgId).or("user_id.is.null,user_id.eq."+userId).order("created_at",{ascending:false}).limit(50);
    let rows=data||[];
    if(has(q,"unread"))rows=rows.filter(n=>!n.read_at);
    return ok(
      rows.length?"Found "+rows.length+" notification record"+(rows.length===1?"":"s")+" matching this request.":"No matching notifications were found.",
      "notifications",
      rows.map(n=>({label:n.title,meta:(n.read_at?"Read":"Unread")+" · "+(n.body||n.kind)+" · "+isoDate(n.created_at),href:n.href||"/notifications"}))
    );
  }

  if(has(q,"billing","plan","subscription","trial","price")){
    const {data:account}=await supabase.from("billing_accounts").select("plan_code,status,trial_ends_at,current_period_start,current_period_end,cancel_at_period_end,provider").eq("organization_id",orgId).maybeSingle();
    if(!account)return ok("No billing account record was found for this workspace.","billing");
    const {data:plan}=await supabase.from("plan_catalog").select("name,monthly_amount_minor,currency,seats_limit,projects_limit,ai_runs_monthly_limit,storage_gb_limit").eq("code",account.plan_code).maybeSingle();
    const amount=plan?.monthly_amount_minor===null||plan?.monthly_amount_minor===undefined?"Custom / not stored":(plan.monthly_amount_minor/100).toLocaleString()+" "+plan.currency;
    return ok(
      "Database billing record: "+(plan?.name||account.plan_code)+" · status "+account.status+" · provider "+account.provider+" · price "+amount+" · trial ends "+isoDate(account.trial_ends_at)+" · current period ends "+isoDate(account.current_period_end)+".",
      "billing",
      [{label:plan?.name||account.plan_code,meta:"Seats "+(plan?.seats_limit??"Custom")+" · projects "+(plan?.projects_limit??"Custom")+" · AI runs/month "+(plan?.ai_runs_monthly_limit??"Custom")+" · storage "+(plan?.storage_gb_limit??"Custom")+" GB",href:"/billing"}]
    );
  }

  if(has(q,"audit","history","change","changes","activity")){
    const {data}=await supabase.from("audit_events").select("id,actor_user_id,object_type,object_id,action,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(30);
    const rows=data||[];
    return ok(
      rows.length?"Showing the latest "+rows.length+" audit event"+(rows.length===1?"":"s")+" from the database.":"No audit events were found.",
      "audit",
      rows.map(e=>({label:e.action+" · "+e.object_type,meta:e.object_id+" · "+new Date(e.created_at).toLocaleString("en-GB"),href:"/audit"}))
    );
  }

  if(has(q,"ai run","ai runs","ai usage","model","models")){
    const [runsResult,settingsResult]=await Promise.all([
      supabase.from("ai_runs").select("id,provider,model,task_type,status,input_tokens,output_tokens,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(30),
      supabase.from("ai_settings").select("provider,main_model,fast_model,reasoning_model,monthly_cap_usd,alert_percent,processing_region").eq("organization_id",orgId).maybeSingle()
    ]);
    const runs=runsResult.data||[];
    const settings=settingsResult.data;
    return ok(
      "Database AI configuration: provider "+(settings?.provider||"not stored")+", main model "+(settings?.main_model||"not stored")+", fast model "+(settings?.fast_model||"not stored")+", reasoning model "+(settings?.reasoning_model||"not stored")+". The database contains "+runs.length+" recent AI run record"+(runs.length===1?"":"s")+" in this result.",
      "AI records",
      runs.map(r=>({label:r.task_type+" · "+r.status,meta:r.provider+"/"+r.model+" · input "+(r.input_tokens??"—")+" · output "+(r.output_tokens??"—")+" · "+new Date(r.created_at).toLocaleString("en-GB"),href:"/settings/ai"}))
    );
  }

  if(has(q,"report","reports","snapshot","snapshots")){
    const {data}=await supabase.from("report_snapshots").select("id,report_type,created_at,contract_id,project_id").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(30);
    const rows=data||[];
    return ok(
      rows.length?"The database contains "+rows.length+" recent report snapshot record"+(rows.length===1?"":"s")+" in this result.":"No report snapshots were found.",
      "reports",
      rows.map(r=>({label:r.report_type,meta:new Date(r.created_at).toLocaleString("en-GB"),href:"/reports"}))
    );
  }

  const term=cleanSearch(query);
  if(!term)return ok("No matching database record was found.","database search");
  const like="%"+term+"%";

  const [projects,contracts,documents,gaps,actions,obligations]=await Promise.all([
    supabase.from("projects").select("id,code,name,status").eq("organization_id",orgId).ilike("name",like).limit(8),
    supabase.from("contracts").select("id,contract_number,title,status").eq("organization_id",orgId).ilike("title",like).limit(8),
    supabase.from("documents").select("id,file_name,processing_status").eq("organization_id",orgId).ilike("file_name",like).limit(8),
    supabase.from("gaps").select("id,gap,severity,status").eq("organization_id",orgId).ilike("gap",like).limit(8),
    supabase.from("actions").select("id,gap_id,action_text,status").eq("organization_id",orgId).ilike("action_text",like).limit(8),
    supabase.from("obligations").select("id,obligation_text,status,source_locator").eq("organization_id",orgId).ilike("obligation_text",like).limit(8)
  ]);

  const records:RecordLink[]=[
    ...(projects.data||[]).map(p=>({label:"Project · "+p.code+" · "+p.name,meta:p.status,href:"/projects"})),
    ...(contracts.data||[]).map(c=>({label:"Contract · "+(c.contract_number||"No reference")+" · "+c.title,meta:c.status,href:"/contracts"})),
    ...(documents.data||[]).map(d=>({label:"Document · "+d.file_name,meta:d.processing_status,href:"/documents"})),
    ...(gaps.data||[]).map(g=>({label:"Gap · "+g.gap,meta:g.severity+" · "+g.status,href:"/gaps/"+g.id})),
    ...(actions.data||[]).map(a=>({label:"Action · "+a.action_text,meta:a.status,href:a.gap_id?"/gaps/"+a.gap_id:"/actions"})),
    ...(obligations.data||[]).map(o=>({label:"Obligation · "+o.obligation_text,meta:o.status+" · "+o.source_locator,href:"/obligations"}))
  ].slice(0,30);

  return ok(
    records.length?"Found "+records.length+" database record"+(records.length===1?"":"s")+" matching “"+term+"”.":"No database records matched “"+term+"”. I do not infer or generate an answer when the workspace database has no matching record.",
    "database search",
    records
  );
}
