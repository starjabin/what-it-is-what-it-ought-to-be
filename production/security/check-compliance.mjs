import {readFileSync,readdirSync} from "node:fs";import {fileURLToPath} from "node:url";import {join,relative} from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
export function discoverRoutes(base=root){const visit=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?visit(join(dir,e.name)):/^(page|route)\.tsx?$/.test(e.name)?[relative(base,join(dir,e.name)).replaceAll("\\","/")]:[]);return visit(join(base,"app")).sort()}
export function checkCompliance(register,paths,{release=false,now=Date.now()}={}){
 if(register.schemaVersion!==1||register.scope!=="entire-application-and-operating-organization"||register.releasePolicy!=="independent-evidence-required"||!Array.isArray(register.controls)||register.controls.length!==10||!Array.isArray(register.routes))throw Error("Invalid compliance register");
 const expected=new Set(paths),seen=new Set(),ids=new Set();
 function verify(entry){if(!entry.ownerRole?.trim()||!["not-accepted","accepted"].includes(entry.status)||!Array.isArray(entry.requiredEvidence)||!entry.requiredEvidence.length||new Set(entry.requiredEvidence).size!==entry.requiredEvidence.length)throw Error("Invalid compliance entry");
 if(entry.status==="accepted"){const a=entry.acceptance;if(!a||typeof a.implementedBy!=="string"||typeof a.reviewedBy!=="string"||!a.implementedBy.trim()||!a.reviewedBy.trim()||a.implementedBy.trim().toLowerCase()===a.reviewedBy.trim().toLowerCase()||!(Date.parse(a.validUntil)>now)||!Array.isArray(a.evidence)||a.evidence.length!==entry.requiredEvidence.length||entry.requiredEvidence.some(k=>a.evidence.filter(e=>e.requirement===k&&typeof e.reference==="string"&&e.reference.trim()).length!==1))throw Error("Missing independent acceptance evidence");}}
 for(const c of register.controls){if(!/^CMP-(0[1-9]|10)$/.test(c.id)||ids.has(c.id)||!c.framework||!c.objective)throw Error("Duplicate or invalid control");ids.add(c.id);verify(c);}
 for(const r of register.routes){if(!expected.has(r.path)||seen.has(r.path)||!["public","tenant","tenant-api","public-api","synthetic-staging","retired","held"].includes(r.scope))throw Error("Unknown or duplicate route");seen.add(r.path);verify(r);}
 if(seen.size!==expected.size)throw Error("Unregistered application route");
 const acceptedControls=register.controls.filter(c=>c.status==="accepted").length,acceptedRoutes=register.routes.filter(r=>r.status==="accepted").length;
 if(release&&(acceptedControls!==register.controls.length||acceptedRoutes!==register.routes.length))throw Error("Compliance release blocked: incomplete acceptance");
 // This gate validates evidence metadata, never authenticates a certificate or grants release.
 return {controls:register.controls.length,routes:register.routes.length,acceptedControls,acceptedRoutes,certificationStatus:register.certificationStatus};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){console.log("Application compliance scope:",checkCompliance(JSON.parse(readFileSync(new URL("compliance-register.json",import.meta.url),"utf8")),discoverRoutes(),{release:process.argv.includes("--release")}))}
