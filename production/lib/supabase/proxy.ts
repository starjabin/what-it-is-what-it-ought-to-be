import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
const exactPublic=new Set(["/","/sign-in","/sign-up","/assistant","/privacy","/terms","/dpa","/robots.txt","/sitemap.xml","/api/health","/api/customer-assistant"]);
function isPublic(path:string){return exactPublic.has(path)||path.startsWith("/auth/")||path.startsWith("/join/")||path.startsWith("/_next/")}
export async function updateSession(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return NextResponse.next({request});
 let response=NextResponse.next({request});const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
 const {data}=await supabase.auth.getClaims();const claims=data?.claims as any|undefined;const path=request.nextUrl.pathname;
 const strict=process.env.CHATGPT_ONLY_AUTH_ENFORCED==="true";
 if(claims&&strict){const meta=claims.app_metadata||{};const providers=[...(Array.isArray(meta.providers)?meta.providers:[]),meta.provider].filter(Boolean).map(String);if(!providers.some(p=>p.includes("chatgpt"))){if(path.startsWith("/api/"))return NextResponse.json({error:"ChatGPT identity is required."},{status:401});const dest=request.nextUrl.clone();dest.pathname="/sign-in";dest.searchParams.set("next",path);return NextResponse.redirect(dest)}}
 if(!claims&&!isPublic(path)&&!path.startsWith("/api/")){const dest=request.nextUrl.clone();dest.pathname="/sign-in";dest.searchParams.set("next",path);return NextResponse.redirect(dest)}
 return response;
}