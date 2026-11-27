import {safeReturnPath} from "@/lib/security/safe-return-path";
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function GET(request:Request){const {searchParams,origin}=new URL(request.url);const code=searchParams.get("code");const next=safeReturnPath(searchParams.get("next"));const supabase=await createClient();if(code&&supabase){const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(origin+next)}return NextResponse.redirect(origin+"/sign-in")}
