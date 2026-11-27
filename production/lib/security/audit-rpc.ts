import type {AuditSink} from "./security-events.ts";
import type {Rpc} from "../ai/execution-reservation.ts";
/** Server-only RPC binding. No arbitrary strings or content included. */
export function createAuditSink(rpc:Rpc):AuditSink{
 return async e=>{
  const result=await rpc("append_ai_security_event",{p_org:e.orgId,p_actor:e.actorId,p_request:e.requestId,p_event:e.event,p_reason:e.reason});
  if(result.error)throw Error("Security event persistence denied");
 };
}
