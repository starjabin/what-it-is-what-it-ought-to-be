import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {verifiedMfaSubject,chooseWorkspace,WORKSPACE_COOKIE} from "@/lib/security/session-scope";
export async function getWorkspaceContext(){
 const supabase=await createClient();if(!supabase)redirect("/sign-in");
 const {data,error}=await supabase.auth.getClaims();if(error||!data?.claims)redirect("/sign-in");
 const userId=verifiedMfaSubject(data.claims);if(!userId)redirect("/mfa");
 const {data:members,error:membershipError}=await supabase.from("organization_members").select("organization_id,role,display_name,email,job_title,organizations(name,market,currency)").eq("user_id",userId).limit(101);
 if(membershipError||!members)throw Error("Workspace membership unavailable");
 if(!members.length)redirect("/workspace-select");
 const membership=chooseWorkspace(members,(await cookies()).get(WORKSPACE_COOKIE)?.value);
 if(!membership)redirect("/workspace-select");
 const org=membership.organizations as unknown as {name:string;market:string;currency:string}|null;
 return {supabase,userId,orgId:membership.organization_id,role:membership.role,displayName:membership.display_name,email:membership.email,jobTitle:membership.job_title,organization:org};
}
