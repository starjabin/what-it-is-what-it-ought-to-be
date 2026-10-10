import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
const exactPublic=new Set(["/","/sign-in","/sign-up","/assistant","/privacy","/terms","/dpa","/robots.txt","/sitemap.xml","/api/health","/api/customer-assistant"]);
function isPublic(path:string){return exactPublic.has(path)||path.startsWith("/auth/")||path.startsWith("/join/")||path.startsWith("/_next/")}
export async function updateSession(request:NextRequest){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.next({request});
  let response=NextResponse.next({request});
  const supabase=createServerClient(url,key,{cookies:{getAll(){return request.cookies.getAll()},setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const {data}=await supabase.auth.getClaims();
  const claims=data?.claims;
  const path=request.nextUrl.pathname;
  if(!claims&&!isPublic(path)&&!path.startsWith("/api/")){
    const dest=request.nextUrl.clone();
    dest.pathname="/sign-in";
    dest.searchParams.set("next",path);
    return NextResponse.redirect(dest);
  }
  return response;
}
