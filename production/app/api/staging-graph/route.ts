import {neon} from "@neondatabase/serverless";
import {NextResponse} from "next/server";
import {readBoundedJson,parseGraphInput,RequestContractError} from "../../../lib/security/request-contract";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
function connect(){
 if(process.env.GAP_GRAPH_MODE!=="synthetic-staging"||!process.env.GAP_GRAPH_DATABASE_URL)return null;
 const url=new URL(process.env.GAP_GRAPH_DATABASE_URL);
 if(url.username!=="gap_graph_app"||url.pathname!=="/gap_controls_staging"||!url.hostname.endsWith(".neon.tech")||url.searchParams.get("sslmode")!=="require")return null;
 return neon(process.env.GAP_GRAPH_DATABASE_URL);
}
export async function GET(){
 try{const sql=connect();if(!sql)return response({error:"Staging database not configured"},503);const rows=await sql`select gap_graph.recent_reviews() as result`;return response({mode:"synthetic",runs:rows[0].result});}catch{return response({error:"Staging database unavailable"},503);}
}
export async function POST(request:Request){
 // Vercel project protection is mandatory; this shared synthetic fixture is not customer authentication.
 try{
  const origin=request.headers.get("origin"),host=request.headers.get("host");
  if(!origin||!host||new URL(origin).protocol!=="https:"||new URL(origin).host!==host||!host.endsWith(".vercel.app"))return response({error:"Origin denied"},403);
  const {requestId,observed,required}=parseGraphInput(await readBoundedJson(request,500));
  const sql=connect();if(!sql)return response({error:"Staging database not configured"},503);
  const rows=await sql`select gap_graph.run_review(${requestId}::uuid,${observed}::integer,${required}::integer) as result`;
  return response({mode:"synthetic",run:rows[0].result});
 }catch(e){if(e instanceof RequestContractError)return response({error:e.message,code:e.code},e.status);return response({error:"Review denied or allowance exhausted; no partial result",code:"REVIEW_DENIED"},409);}
}
