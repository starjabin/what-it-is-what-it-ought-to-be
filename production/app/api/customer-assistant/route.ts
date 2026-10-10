import OpenAI from "openai";
import {NextResponse} from "next/server";

export const runtime="nodejs";

type Message={role:"user"|"assistant";content:string};
const limits=new Map<string,{count:number;reset:number}>();

function allow(ip:string){
  const now=Date.now();
  const item=limits.get(ip);
  if(!item||item.reset<now){limits.set(ip,{count:1,reset:now+60*60*1000});return true}
  if(item.count>=20)return false;
  item.count+=1;return true;
}

export async function POST(request:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Customer assistant is not configured."},{status:503});
  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  if(!allow(ip))return NextResponse.json({error:"Too many requests. Please try again later."},{status:429});

  const body=await request.json().catch(()=>null) as {messages?:Message[]}|null;
  const messages=(body?.messages||[]).slice(-8).filter(m=>["user","assistant"].includes(m.role)&&typeof m.content==="string"&&m.content.length<=2000);
  if(!messages.length)return NextResponse.json({error:"A message is required."},{status:400});

  const transcript=messages.map(m=>`${m.role==="user"?"Customer":"Assistant"}: ${m.content}`).join("\n");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});

  try{
    const response=await client.responses.create({
      model:process.env.CUSTOMER_ASSISTANT_MODEL||"gpt-6-luna",
      store:false,
      max_output_tokens:500,
      instructions:`You are the public customer assistant for "What It Is / What It Ought to Be", an international B2B Contract Intelligence product.

Explain the product clearly and help prospective customers decide whether to create a workspace. Core value loop: Evidence → Position → Gap → Impact → Action → Accountability → Outcome. The Gap Engine compares WHAT IT IS with WHAT IT OUGHT TO BE and records WHY, EVIDENCE, GAP, IMPACT, ACTION, OWNER, DEADLINE and STATUS.

Target customers include contractors, consultants, owners/developers, PMCs, commercial/contracts teams, QS, claims teams, legal teams and executives. The product supports projects, contracts, evidence, structured gaps, actions, auditability and evidence-grounded AI.

Never claim you can see a visitor's account, uploaded documents, tenant data, billing account, email, or private contracts. You have no access to those systems. Never provide legal advice or state legal certainty. Do not invent customer-specific contract clauses or entitlement. If asked to analyze a real contract, direct the customer to create/sign in to a workspace and use the protected AI Analyst. Do not promise a fixed price unless the application itself shows one; say plans and enterprise terms can be configured. Be concise, commercially helpful, and transparent.`,
      input:transcript
    });
    return NextResponse.json({answer:response.output_text,model:response.model});
  }catch(error){
    console.error("customer-assistant",error);
    return NextResponse.json({error:"The customer assistant is temporarily unavailable."},{status:502});
  }
}
