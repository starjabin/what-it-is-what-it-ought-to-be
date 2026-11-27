// Run manually on a trusted machine only, against approved synthetic staging accounts and evidence.
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {createInterface} from "node:readline/promises";
import {Writable} from "node:stream";
import {verifyEvidenceBlob} from "../../lib/security/evidence-integrity.ts";

const URL="https://jwsmsahtbbrugduuzxun.supabase.co";
function env(name){const value=process.env[name];if(!value)throw Error("Missing local input: "+name);return value}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=env("SF01_PUBLISHABLE_KEY");
assert.ok(key.startsWith("sb_publishable_"),"Use the staging publishable key, never a service-role key");
if(!process.stdin.isTTY)throw Error("Interactive trusted terminal required");
function fixture(label){const f={label,email:env("SF01_"+label+"_EMAIL"),org:env("SF01_"+label+"_ORG"),project:env("SF01_"+label+"_PROJECT"),version:env("SF01_"+label+"_VERSION")};assert.ok([f.org,f.project,f.version].every(x=>uuid.test(x)),"Fixture UUIDs required");return f}
const a=fixture("A"),b=fixture("B");assert.notEqual(a.org,b.org,"Distinct tenant fixtures required");assert.notEqual(a.email,b.email,"Distinct accounts required");
const rl=createInterface({input:process.stdin,output:new Writable({write(_c,_e,done){done()}}),terminal:true});
async function secret(prompt){process.stderr.write(prompt);const value=await rl.question("");process.stderr.write("\n");return value}
const clients=[];
function pass(label){console.log("PASS "+label)}
function denied(r,label){assert.ok(r.error||!r.data||(Array.isArray(r.data)&&r.data.length===0),label)}
async function authenticate(f){
 const client=createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(client);
 const password=await secret(f.label+" staging password (hidden): ");
 const signed=await client.auth.signInWithPassword({email:f.email,password});assert.ok(!signed.error&&signed.data.user,"Password sign-in failed for "+f.label);
 const low=await client.auth.getClaims();assert.ok(!low.error&&low.data?.claims?.aal==="aal1","Initial AAL1 required");
 const inaccessible=await client.from("document_versions").select("id").eq("id",f.version);denied(inaccessible,f.label+" AAL1 read");pass(f.label+" password login and AAL1 evidence denied");
 const factors=await client.auth.mfa.listFactors();const factor=factors.data?.totp?.find(x=>x.status==="verified");assert.ok(!factors.error&&factor,"Enroll and verify TOTP in protected staging UI first");
 const code=await secret(f.label+" fresh six-digit TOTP (hidden): ");assert.match(code,/^\d{6}$/);
 const challenge=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code});assert.ok(!challenge.error,"TOTP verification failed for "+f.label);
 const claims=await client.auth.getClaims(),user=await client.auth.getUser();assert.ok(!claims.error&&!user.error&&claims.data?.claims?.aal==="aal2"&&claims.data.claims.role==="authenticated"&&claims.data.claims.sub===user.data.user?.id,"Verified AAL2 identity required");
 assert.equal(claims.data.claims.iss,URL+"/auth/v1","Unexpected issuer");
 const aud=claims.data.claims.aud;assert.ok(aud==="authenticated"||(Array.isArray(aud)&&aud.includes("authenticated")),"Unexpected audience");pass(f.label+" live TOTP, issuer, audience and identity");
 const projects=await client.from("projects").select("id,organization_id").eq("id",f.project).eq("organization_id",f.org).single();assert.ok(!projects.error&&projects.data,"Own project inaccessible");
 const version=await client.from("document_versions").select("id,organization_id,document_id,storage_path,content_hash,byte_size").eq("id",f.version).eq("organization_id",f.org).single();assert.ok(!version.error&&version.data,"Own revision inaccessible");
 const doc=await client.from("documents").select("id,project_id").eq("id",version.data.document_id).eq("project_id",f.project).single();assert.ok(!doc.error&&doc.data,"Revision does not belong to fixture project");
 const downloaded=await client.storage.from("contract-evidence").download(version.data.storage_path);assert.ok(!downloaded.error&&downloaded.data,"Own source download denied");await verifyEvidenceBlob(downloaded.data,version.data);pass(f.label+" own project and actual stored bytes verified");
 return {client,version:version.data};
}
try{
 const A=await authenticate(a),B=await authenticate(b);
 for(const [self,other,foreign] of [[A,B,b],[B,A,a]]){
  denied(await self.client.from("projects").select("id").eq("id",foreign.project),"Cross-tenant project read");
  denied(await self.client.from("document_versions").select("id").eq("id",foreign.version),"Cross-tenant revision read");
  denied(await self.client.storage.from("contract-evidence").download(other.version.storage_path),"Cross-tenant storage download");
  pass("Cross-tenant project, revision and storage denied");
 }
 console.log("PASS live read-only staging acceptance. Browser upload/closure, mutation and concurrency require separate tests.");
}catch(e){console.error("FAIL: live staging acceptance did not complete; inspect locally without recording credentials or token contents.");process.exitCode=1}
finally{for(const client of clients){await client.auth.signOut({scope:"local"}).catch(()=>{})}rl.close()}
