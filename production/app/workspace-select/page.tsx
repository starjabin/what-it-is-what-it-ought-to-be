import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {verifiedMfaSubject,chooseWorkspace,WORKSPACE_COOKIE} from "@/lib/security/session-scope";
async function selectWorkspace(form:FormData){"use server";
 const s=await createClient();if(!s)redirect("/sign-in");const {data,error}=await s.auth.getClaims();if(error||!data?.claims)redirect("/sign-in");const user=verifiedMfaSubject(data.claims);if(!user)redirect("/mfa");
 const {data:members,error:err}=await s.from("organization_members").select("organization_id").eq("user_id",user).limit(101);
 if(err||!members)throw Error("Workspace membership unavailable");
 const choice=form.get("workspace");if(typeof choice!=="string"||!choice)redirect("/workspace-select");const selected=chooseWorkspace(members,choice);if(!selected)redirect("/workspace-select");
 (await cookies()).set(WORKSPACE_COOKIE,selected.organization_id,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:3600});redirect("/dashboard");
}
export default async function WorkspaceSelect(){
 const s=await createClient();if(!s)redirect("/sign-in");const {data,error}=await s.auth.getClaims();if(error||!data?.claims)redirect("/sign-in");const user=verifiedMfaSubject(data.claims);if(!user)redirect("/mfa");
 const {data:members,error:err}=await s.from("organization_members").select("organization_id,role,organizations(name)").eq("user_id",user).limit(101);
 if(err||!members)throw Error("Workspace membership unavailable");
 return <main className="gapPage"><section className="card gapPanel"><h1>Select your workspace</h1><p>Only current memberships can be selected. An administrator must provision new staging memberships.</p>{members.length?<form className="gapForm" action={selectWorkspace}><label htmlFor="workspace">Organization</label><select id="workspace" name="workspace" required defaultValue=""><option value="" disabled>Choose an organization</option>{members.map(m=><option key={m.organization_id} value={m.organization_id}>{(m.organizations as unknown as {name?:string}|null)?.name??m.organization_id} · {m.role}</option>)}</select><button type="submit" className="btn primary">Open workspace</button></form>:<p role="status">No active workspace membership. Contact your staging administrator.</p>}</section></main>
}
