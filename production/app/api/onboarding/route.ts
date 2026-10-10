import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
type Payload={displayName?:string;jobTitle?:string;organization?:string;projectName?:string;projectCode?:string;market?:string;currency?:string};
const currencies=new Set(["USD","SAR","AED","GBP","EUR"]);

export async function POST(request:Request){
  const supabase=await createClient();
  if(!supabase)return NextResponse.json({error:"Authentication is not configured."},{status:503});
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});
  const body=await request.json().catch(()=>null) as Payload|null;
  const displayName=body?.displayName?.trim()||"",organization=body?.organization?.trim()||"",projectName=body?.projectName?.trim()||"",projectCode=body?.projectCode?.trim()||"",jobTitle=body?.jobTitle?.trim()||"",market=body?.market?.trim()||"Global / International",currency=body?.currency?.trim()||"USD";
  if(displayName.length<2)return NextResponse.json({error:"Enter your name."},{status:400});
  if(organization.length<2||organization.length>160)return NextResponse.json({error:"Enter a valid organization name."},{status:400});
  if(projectName.length<2||projectName.length>200)return NextResponse.json({error:"Enter a valid project name."},{status:400});
  if(projectCode.length<1||projectCode.length>60)return NextResponse.json({error:"Enter a valid project code."},{status:400});
  if(!currencies.has(currency))return NextResponse.json({error:"Unsupported currency."},{status:400});

  const {data,error}=await supabase.rpc("bootstrap_workspace_v2",{p_display_name:displayName,p_job_title:jobTitle,p_organization_name:organization,p_market:market,p_currency:currency,p_project_name:projectName,p_project_code:projectCode});
  if(error){console.error("workspace-bootstrap-v2",error);return NextResponse.json({error:"Workspace creation failed. Please retry."},{status:500})}
  return NextResponse.json({ok:true,workspace:data});
}
