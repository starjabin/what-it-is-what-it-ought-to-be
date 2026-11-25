import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
export function checkControls(r,release=false){
 if(r.schemaVersion!==1||r.scope!=="staging"||r.releasePolicy!=="deny-until-independent-acceptance"||!Array.isArray(r.controls)||r.controls.length!==10)throw Error("Invalid security control register");
 const ids=new Set();
 for(const c of r.controls){
  if(!/^KS-SEC-(0[1-9]|10)$/.test(c.id)||ids.has(c.id)||!c.ownerRole||!c.implementation||!["partial","blocked","accepted"].includes(c.status)||!Array.isArray(c.releaseEvidence)||!c.releaseEvidence.length)throw Error("Invalid control");
  ids.add(c.id);
  if(c.status==="accepted"&&(!c.acceptance||!c.acceptance.reviewedBy||!c.acceptance.implementedBy||c.acceptance.reviewedBy.trim().toLowerCase()===c.acceptance.implementedBy.trim().toLowerCase()||!Array.isArray(c.acceptance.evidence)||c.acceptance.evidence.length<c.releaseEvidence.length||c.acceptance.evidence.some(e=>typeof e!=="string"||!e.trim())))throw Error("Missing independent evidence");
 }
 if(release&&r.controls.some(c=>c.status!=="accepted"))throw Error("Security release blocked: unaccepted controls");
 return {controls:ids.size,accepted:r.controls.filter(c=>c.status==="accepted").length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){console.log("Security control register:",checkControls(JSON.parse(readFileSync(new URL("control-register.json",import.meta.url),"utf8")),process.argv.includes("--release")));}
