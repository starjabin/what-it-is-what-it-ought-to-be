/** Strict structured telemetry: no prompts, source text, arbitrary error objects, tokens, URLs or headers. */
export type SecurityEvent={requestId:string;orgId:string;actorId:string;event:"authorized"|"reserved"|"dispatch"|"blocked"|"completed"|"failed";reason:"none"|"scope"|"firewall"|"policy"|"allowance"|"provider"|"persistence";at:string};
export type AuditSink=(event:SecurityEvent)=>Promise<void>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function eventRecord(ids:Pick<SecurityEvent,"requestId"|"orgId"|"actorId">,event:SecurityEvent["event"],reason:SecurityEvent["reason"]):SecurityEvent {
 if(![ids.requestId,ids.orgId,ids.actorId].every(x=>typeof x==="string"&&uuid.test(x)))throw Error("Invalid security event scope");
 if(!["authorized","reserved","dispatch","blocked","completed","failed"].includes(event)||!["none","scope","firewall","policy","allowance","provider","persistence"].includes(reason))throw Error("Invalid security event code");
 return {requestId:ids.requestId,orgId:ids.orgId,actorId:ids.actorId,event,reason,at:new Date().toISOString()};
}
export function requireExecutionEnabled(config:{environment:string;enabled:boolean;emergencyStop:boolean}):void {
 if(config.environment!=="staging"||config.enabled!==true||config.emergencyStop!==false)throw Error("AI execution disabled");
}
