import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
type Payload={displayName?:string;jobTitle?:string;organization?:string;projectName?:string;projectCode?:string;contractTitle?:string;contractNumber?:string;market?:string;currency?:string};
const currencies=new Set(["USD","SAR","AED","GBP","EUR"]);
export async function POST(request:Request){
 const supabase=await createClient();if(!supabase)return NextResponse.json({error:"Authentication is not configured."},{status:503});
 const {data:claims}=await supabase.auth.getClaims();if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});
 const b=await request.json().catch(()=>null) as Payload|null;
 const displayName=b?.displayName?.trim()||"",organization=b?.organization?.trim()||"",projectName=b?.projectName?.trim()||"",projectCode=b?.projectCode?.trim()||"",contractTitle=b?.contractTitle?.trim()||"",contractNumber=b?.contractNumber?.trim()||"",jobTitle=b?.jobTitle?.trim()||"",market=b?.market?.trim()||"Global / International",currency=b?.currency?.trim()||"USD";
 if(displayName.length<2)return NextResponse.json({error:"Enter your name."},{status:400});if(organization.length<2)return NextResponse.json({error:"Enter an organization name."},{status:400});if(projectName.length<2)return NextResponse.json({error:"Enter a project name."},{status:400});if(!projectCode)return NextResponse.json({error:"Enter a project code."},{status:400});if(contractTitle.length<2)return NextResponse.json({error:"Enter the first contract title."},{status:400});if(!currencies.has(currency))return NextResponse.json({error:"Unsupported currency."},{status:400});
 const {data,error}=await supabase.rpc("bootstrap_workspace_v3",{p_display_name:displayName,p_job_title:jobTitle,p_organization_name:organization,p_market:market,p_currency:currency,p_project_name:projectName,p_project_code:projectCode,p_contract_title:contractTitle,p_contract_number:contractNumber});
 if(error){console.error("workspace-bootstrap-v3",error);return NextResponse.json({error:"Workspace creation failed safely. Please retry."},{status:500})}
 return NextResponse.json({ok:true,workspace:data});
}