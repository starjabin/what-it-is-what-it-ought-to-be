import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";

export async function POST(request:Request){
  if(!process.env.RESEND_API_KEY)return NextResponse.json({error:"Email service is not configured."},{status:503});
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Authentication is not configured."},{status:503});
  const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});
  const body=await request.json().catch(()=>null) as {assignmentId?:string}|null;
  if(!body?.assignmentId)return NextResponse.json({error:"Assignment is required."},{status:400});
  const {data:a,error}=await supabase.from("document_assignments").select("id,organization_id,document_id,assignee_user_id,assignee_label,instruction,priority,due_at,status").eq("id",body.assignmentId).maybeSingle();
  if(error||!a)return NextResponse.json({error:"Assignment not found."},{status:404});
  if(!a.assignee_user_id)return NextResponse.json({error:"The assignment has no user email recipient."},{status:400});
  const [{data:member},{data:doc},{data:org}]=await Promise.all([
    supabase.from("organization_members").select("email,display_name").eq("organization_id",a.organization_id).eq("user_id",a.assignee_user_id).maybeSingle(),
    supabase.from("documents").select("file_name").eq("id",a.document_id).maybeSingle(),
    supabase.from("organizations").select("name").eq("id",a.organization_id).maybeSingle()
  ]);
  if(!member?.email)return NextResponse.json({error:"The assignee has no email address."},{status:400});
  const base=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  const from=process.env.EMAIL_FROM||"What It Is / What It Ought to Be <onboarding@resend.dev>";
  const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({
    from,to:[member.email],subject:"Document assigned for action",
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#102a43"><h2>Document action assigned</h2><p>Hello ${member.display_name||"team member"},</p><p><b>${doc?.file_name||"A project document"}</b> has been assigned to you in ${org?.name||"your workspace"}.</p><p><b>Required action:</b> ${a.instruction}</p><p><b>Priority:</b> ${a.priority}<br><b>Due:</b> ${a.due_at||"No due date set"}</p><p><a href="${base}/documents" style="display:inline-block;background:#2f6fed;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Open document workspace</a></p></div>`
  })});
  if(!res.ok){const detail=await res.text();console.error("resend-document-assignment",detail);return NextResponse.json({error:"Email provider rejected the message."},{status:502})}
  return NextResponse.json({ok:true});
}
