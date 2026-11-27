import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const validApproval=(a,now)=>a&&typeof a.requestedBy==="string"&&a.requestedBy.trim()&&typeof a.reviewedBy==="string"&&a.reviewedBy.trim()&&a.requestedBy.trim()!==a.reviewedBy.trim()&&typeof a.ticket==="string"&&a.ticket.trim()&&Date.parse(a.expiresAt)>now;
export function validateRegistry(manifest,{release=false,now=Date.now(),readArtifact=path=>readFileSync(path)}={}){
 if(manifest.schemaVersion!==1||manifest.policy!=="deny-by-default"||!Array.isArray(manifest.artifacts))throw Error("Invalid trust registry");
 const seen=new Set();
 for(const a of manifest.artifacts){
  if(!["model","skill","package","mcp"].includes(a.kind)||typeof a.id!=="string"||!a.id.trim()||seen.has(a.kind+":"+a.id)||!["pending","approved","revoked"].includes(a.status)||!Array.isArray(a.capabilities))throw Error("Invalid or duplicate artifact entry");
  seen.add(a.kind+":"+a.id);
  if(a.status==="approved"&&(!validApproval(a.approval,now)||!a.source||!a.version||!a.publisher||!a.integrity||!a.capabilities.length))throw Error("Approved artifact lacks valid review or identity");
  if(a.kind==="skill"&&typeof a.source==="string"&&a.source.startsWith("repository:")){
   const path=resolve(root,a.source.slice(11));
   if(!path.startsWith(root.endsWith(sep)?root:root+sep))throw Error("Skill path escapes repository root");
   if("sha256:"+createHash("sha256").update(readArtifact(path)).digest("hex")!==a.integrity)throw Error("Local skill digest mismatch");
  }
 }
 if(release&&(manifest.packageInventory?.state!=="approved"||!validApproval(manifest.packageInventory.approval,now)))throw Error("Package inventory lacks independent release approval");
 return {artifacts:seen.size,approved:manifest.artifacts.filter(a=>a.status==="approved").length,release};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const manifest=JSON.parse(readFileSync(new URL("trusted-registry.json",import.meta.url),"utf8"));
 console.log("Verified trusted registry",validateRegistry(manifest,{release:process.argv.includes("--release")}));
}
