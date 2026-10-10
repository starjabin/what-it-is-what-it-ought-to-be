import OpenAI from "openai";
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const runtime="nodejs";

const schema={
  type:"object",
  properties:{
    what_is:{type:"string"},
    what_ought_to_be:{type:"string"},
    why:{type:"string"},
    evidence:{type:"array",items:{type:"string"}},
    gap:{type:"string"},
    impact:{type:"string"},
    action:{type:"string"},
    owner:{type:"string"},
    deadline:{type:"string"},
    status:{type:"string",enum:["Detected","Under Review"]},
    severity:{type:"string",enum:["Critical","High","Medium","Low","Informational"]},
    confidence:{type:"string",enum:["High","Medium","Low"]},
    missing_information:{type:"array",items:{type:"string"}}
  },
  required:["what_is","what_ought_to_be","why","evidence","gap","impact","action","owner","deadline","status","severity","confidence","missing_information"],
  additionalProperties:false
};

export async function POST(request:Request){
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"OpenAI is not configured."},{status:503});
  const supabase=await createClient();
  if(!supabase)return NextResponse.json({error:"Authentication is not configured."},{status:503});

  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});
  const userId=String(claims.claims.sub);
  const {data:membership}=await supabase.from("organization_members").select("organization_id").eq("user_id",userId).limit(1).maybeSingle();
  if(!membership?.organization_id)return NextResponse.json({error:"Create a workspace before using the analyst."},{status:403});

  const body=await request.json().catch(()=>null) as {text?:string;context?:string}|null;
  if(!body?.text||body.text.length>120000)return NextResponse.json({error:"A valid source text is required."},{status:400});

  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const model=process.env.OPENAI_MODEL||"gpt-6.1-sol";

  try{
    const response=await client.responses.create({
      model,
      store:false,
      instructions:"You are the protected contract intelligence analysis layer for a B2B contract administration product. Use only the source material supplied in this request. Separate facts from inference. Never invent a clause, date, notice, entitlement, party position or evidence reference. If evidence is missing or contradictory, make that explicit. Produce a proposed Gap record for human review. Do not state legal certainty, do not approve the finding, and do not send or draft external correspondence unless the user explicitly requests a draft in a separate workflow.",
      input:`Context: ${body.context??"No additional context."}\n\nSource material:\n${body.text}`,
      text:{format:{type:"json_schema",name:"contract_gap_analysis",strict:true,schema}}
    });

    const proposal=JSON.parse(response.output_text);
    await supabase.from("ai_runs").insert({
      organization_id:membership.organization_id,
      provider:"openai",
      model:response.model,
      task_type:"gap_analysis",
      response_id:response.id,
      status:"completed",
      prompt_version:"gap-analysis-v1",
      input_tokens:response.usage?.input_tokens??null,
      output_tokens:response.usage?.output_tokens??null,
      created_by:userId
    });

    return NextResponse.json({proposal,model:response.model,response_id:response.id});
  }catch(error){
    console.error("gap-analysis",error);
    return NextResponse.json({error:"The AI analysis request failed. Check the OpenAI project billing/model access and try again."},{status:502});
  }
}
