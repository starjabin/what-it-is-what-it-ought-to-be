import OpenAI from "openai";
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const runtime="nodejs";
export const maxDuration=30;

export async function GET(){
  const supabase=await createClient();
  if(!supabase)return NextResponse.json({ok:false,status:"unconfigured"},{status:503});
  const {data:claims}=await supabase.auth.getClaims();
  if(!claims?.claims)return NextResponse.json({error:"Sign in is required."},{status:401});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({ok:false,status:"unconfigured"},{status:503});

  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const model=process.env.CUSTOMER_ASSISTANT_MODEL||"gpt-6-luna";
  try{
    await client.responses.create({
      model,
      store:false,
      max_output_tokens:8,
      input:"Return OK."
    });
    return NextResponse.json({ok:true,status:"healthy",model});
  }catch(error){
    const e=error as {status?:number;code?:string;error?:{code?:string}};
    const code=e?.code||e?.error?.code||"";
    const reason=e?.status===429||code==="insufficient_quota"?"quota":"provider";
    return NextResponse.json({ok:false,status:"unavailable",reason},{status:503});
  }
}
