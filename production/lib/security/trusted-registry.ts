import { createHash } from "node:crypto";
import manifest from "../../security/trusted-registry.json" with { type: "json" };
export type Kind = "model" | "skill" | "package" | "mcp";
export type Artifact = {kind:Kind;id:string;publisher:string;source:string|null;version:string|null;integrity:string|null;environment:string;capabilities:string[];status:string;approval:null|{requestedBy:string;reviewedBy:string;ticket:string;expiresAt:string}};
export type Request = {kind:Kind;id:string;source:string;version:string;integrity:string;environment:string;capabilities:readonly string[]};
const entries: readonly Artifact[] = manifest.artifacts as Artifact[];
const digest=/^sha256:[a-f0-9]{64}$/;
const npmIntegrity=/^sha512-[A-Za-z0-9+/]{86}==$/;
function fail():never { throw new Error("Trusted AI registry denied artifact"); }
/** This is a policy evaluator, not an installer or remote code loader. Only a trusted server supplies the observed identity/digest. */
export function assertTrustedArtifact(request:Request, catalog:readonly Artifact[]=entries, now=Date.now()):Artifact {
  const matches=catalog.filter(e=>e.kind===request.kind&&e.id===request.id);
  if(matches.length!==1) return fail();
  const e=matches[0];
  const a=e.approval;
  if(e.status!=="approved"||!a||!a.requestedBy.trim()||!a.reviewedBy.trim()||a.requestedBy===a.reviewedBy||!a.ticket.trim()||!Number.isFinite(now)||!(Date.parse(a.expiresAt)>now)) return fail();
  if(!e.publisher.trim()||!e.source||!e.version||!e.integrity||e.source!==request.source||e.version!==request.version||e.integrity!==request.integrity||e.environment!==request.environment) return fail();
  if(request.kind==="package"?!npmIntegrity.test(e.integrity):!digest.test(e.integrity)) return fail();
  if(!request.capabilities.length||request.capabilities.some(c=>!e.capabilities.includes(c))) return fail();
  return e;
}
/** Remote model identities are not downloadable weights. A trusted deployment must attest immutable model/version identity; no alias auto-approval. */
export function assertApprovedModel(provider:string,model:string,attestedFingerprint:string,capability:string,environment:string):void {
  assertTrustedArtifact({kind:"model",id:provider+"/"+model,source:"https://api.openai.com/",version:model,integrity:attestedFingerprint,environment,capabilities:[capability]});
}

/** Hash actual bytes rather than trusting a digest supplied by an artifact. */
export function assertTrustedBytes(request:Omit<Request,"integrity">, bytes:Uint8Array, catalog?:readonly Artifact[], now?:number):Artifact {
  if(request.kind==="model") return fail();
  const integrity=request.kind==="package"?"sha512-"+createHash("sha512").update(bytes).digest("base64"):"sha256:"+createHash("sha256").update(bytes).digest("hex");
  return assertTrustedArtifact({...request,integrity},catalog,now);
}
/** Server-only attestation configuration. Model entry must separately have independent approval.
 * No user-controlled settings can grant approval. Fingerprint is an operator attestation,
 * not proof of remote model weights or immutable provider behavior.
 */
export function requireConfiguredModel(model:string,capability:string):void {
  const env=process.env.GAP_AI_ENVIRONMENT;
  const fingerprint=process.env.GAP_AI_MODEL_FINGERPRINT;
  if(env!=="staging"||!fingerprint) return fail();
  assertApprovedModel("openai",model,fingerprint,capability,env);
}
