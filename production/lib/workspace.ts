import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

export async function getWorkspaceContext(){
  const supabase=await createClient();
  if(!supabase)redirect("/sign-in");
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims)redirect("/sign-in");
  const userId=String(claims.claims.sub);
  const {data:membership}=await supabase.from("organization_members")
    .select("organization_id,role,display_name,email,job_title,organizations(name,market,currency)")
    .eq("user_id",userId).limit(1).maybeSingle();
  if(!membership?.organization_id)redirect("/onboarding");
  const org=membership.organizations as unknown as {name:string;market:string;currency:string}|null;
  return {supabase,userId,orgId:membership.organization_id,role:membership.role,displayName:membership.display_name,email:membership.email,jobTitle:membership.job_title,organization:org};
}
