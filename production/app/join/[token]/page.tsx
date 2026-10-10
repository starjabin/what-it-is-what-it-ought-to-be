import {redirect} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";

export default async function JoinPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params; const supabase=await createClient(); if(!supabase)redirect("/sign-in");
 const {data:claims}=await supabase.auth.getClaims(); if(!claims?.claims)redirect("/sign-in?next="+encodeURIComponent("/join/"+token));
 const {error}=await supabase.rpc("accept_team_invitation",{p_token:token});
 if(!error)redirect("/team");
 return <main className="authShell"><section className="authStory"><div className="authStoryCopy"><h1>Join your contract intelligence team.</h1><p>Your invitation is tied to the email address used by the organization.</p></div></section><section className="authFormSide"><div className="authFormBox"><div className="eyebrow">Invitation</div><h2>We could not accept this invitation</h2><p className="muted">{error.message}</p><Link href="/sign-in" className="btn primary authButton">Sign in with the invited email</Link></div></section></main>
}
