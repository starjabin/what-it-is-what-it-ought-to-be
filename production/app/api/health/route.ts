import {NextResponse} from "next/server";
export async function GET(){return NextResponse.json({ok:true,service:"what-it-is-what-it-ought-to-be",supabase:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),openai:Boolean(process.env.OPENAI_API_KEY),billing:process.env.BILLING_PROVIDER??"unconfigured",timestamp:new Date().toISOString()})}
