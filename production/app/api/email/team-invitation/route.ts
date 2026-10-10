import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";

export async function POST(request:Request){
  if(!process.env.RESEND_API_KEY)return NextResponse.json({error:"Email service is not configured."},{status:503});
  const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Authentication is not configured."},{status:503});
  const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});
  const userId=String(claims.claims.sub);
  const body=await request.json().catch(()=>null) as {invitationId?:string}|null;
  if(!body?.invitationId)return NextResponse.json({error:"Invitation is required."},{status:400});
  const {data:invite,error}=await supabase.from("team_invitations").select("id,organization_id,email,role,job_title,token,expires_at,invited_by").eq("id",body.invitationId).maybeSingle();
  if(error||!invite)return NextResponse.json({error:"Invitation not found."},{status:404});
  if(invite.invited_by!==userId)return NextResponse.json({error:"Only the inviter can send this invitation."},{status:403});
  const {data:org}=await supabase.from("organizations").select("name").eq("id",invite.organization_id).maybeSingle();
  const base=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  const joinUrl=base+"/join/"+invite.token;
  const from=process.env.EMAIL_FROM||"What It Is / What It Ought to Be <onboarding@resend.dev>";
  const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({
    from,to:[invite.email],subject:"You have been invited to "+(org?.name||"a contract intelligence workspace"),
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#102a43"><h2>Join ${org?.name||"your team"}</h2><p>You have been invited as <b>${String(invite.role).replaceAll("_"," ")}</b> to a What It Is / What It Ought to Be workspace.</p><p>Use the secure invitation link below. It expires on ${new Date(invite.expires_at).toLocaleDateString()}.</p><p><a href="${joinUrl}" style="display:inline-block;background:#2f6fed;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Accept invitation</a></p><p style="font-size:12px;color:#667085">If you were not expecting this invitation, you can ignore this email.</p></div>`
  })});
  if(!res.ok){const detail=await res.text();console.error("resend-team-invite",detail);return NextResponse.json({error:"Email provider rejected the message."},{status:502})}
  return NextResponse.json({ok:true});
}
