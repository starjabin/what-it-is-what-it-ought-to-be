import {AppShell} from "@/components/app-shell";
import {BillingClient} from "@/components/billing-client";
import {getWorkspaceContext} from "@/lib/workspace";

export default async function Billing(){
  const w=await getWorkspaceContext();
  const monthStart=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();
  const [{data:account},{data:plans},{count:aiUsed},{count:members},{count:projects}]=await Promise.all([
    w.supabase.from("billing_accounts").select("plan_code,status,trial_ends_at,current_period_end,cancel_at_period_end,provider_customer_id,provider_subscription_id").eq("organization_id",w.orgId).maybeSingle(),
    w.supabase.from("plan_catalog").select("code,name,description,monthly_amount_minor,currency,seats_limit,projects_limit,ai_runs_monthly_limit,storage_gb_limit,features").eq("is_public",true).order("sort_order"),
    w.supabase.from("ai_runs").select("id",{count:"exact",head:true}).eq("organization_id",w.orgId).gte("created_at",monthStart),
    w.supabase.from("organization_members").select("user_id",{count:"exact",head:true}).eq("organization_id",w.orgId),
    w.supabase.from("projects").select("id",{count:"exact",head:true}).eq("organization_id",w.orgId)
  ]);
  return <AppShell organizationName={w.organization?.name||"Workspace"}>
    <div className="pageHead"><div><div className="eyebrow">Commercial</div><h1>Plans & Billing</h1><div className="muted">Subscription status, limits and upgrade controls for this organization.</div></div></div>
    <BillingClient orgId={w.orgId} email={w.email||""} account={account} plans={plans||[]} usage={{ai:aiUsed||0,members:members||0,projects:projects||0}}/>
  </AppShell>
}
