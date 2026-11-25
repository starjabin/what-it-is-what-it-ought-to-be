import {authorizeReview,assertReviewCapability,type Scope,type ScopedRecord} from "./permission-broker.ts";
import {assertSafePayload} from "./ai-firewall.ts";
import {eventRecord,requireExecutionEnabled,type AuditSink} from "./security-events.ts";
import {reserveExecution,invokeReserved,type Rpc} from "../ai/execution-reservation.ts";
import {executeReview,type Runner} from "../ai/review-orchestrator.ts";
type Result=Awaited<ReturnType<typeof executeReview>>;
type Input={scope:Scope;verifiedActorId:string;contract:{id:string;orgId:string;projectId:string};evidence:ScopedRecord[];obligations:ScopedRecord[];requestId:string};
/** Explicit dependency boundary: use only a server-owned identity, scoped data reader, policy, durable RPC and atomic commit.
 * Provider runner must be a raw, no-tool adapter (no additional debit); this service charges each specialist.
 * Synthetic staging only until a real authentication binding, approved model and atomic backend are accepted.
 */
export async function controlledReview(input:Input,deps:{
 rpc:Rpc;audit:AuditSink;provider:Runner;providerId:string;checkPolicy:()=>void;checkStop:()=>{environment:string;enabled:boolean;emergencyStop:boolean};
 commit:(jobId:string,result:Result)=>Promise<void>;
}):Promise<Result>{
 const ids={requestId:input.requestId,orgId:input.scope.orgId,actorId:input.verifiedActorId};
 const emit=(event:Parameters<typeof eventRecord>[1],reason:Parameters<typeof eventRecord>[2])=>deps.audit(eventRecord(ids,event,reason));
 let reason:Parameters<typeof eventRecord>[2]="scope";
 try{
  authorizeReview(input.scope,input.verifiedActorId,input.contract,[...input.evidence,...input.obligations]);
  assertReviewCapability("propose-under-review");
  reason="policy";requireExecutionEnabled(deps.checkStop());deps.checkPolicy();
  reason="firewall";
  const evidence=input.evidence.map(({id,text})=>({id,text})),obligations=input.obligations.map(({id,text})=>({id,text}));
  assertSafePayload({evidence,obligations});
  await emit("authorized","none");
  reason="allowance";
  const r=await reserveExecution(deps.rpc,{contractId:input.contract.id,verifiedActorId:input.verifiedActorId,requestId:input.requestId,attempts:4});
  try{
   await emit("reserved","none");
   const result=await executeReview({evidence,obligations},async task=>{
    requireExecutionEnabled(deps.checkStop());deps.checkPolicy();assertSafePayload({evidence:task.evidence,obligations:task.obligations,prior:task.prior});
    await emit("dispatch","none");
    // Recheck immediately before external call; a durable database debit is still required.
    return invokeReserved(r,deps.providerId,task.signal,async()=>{
     requireExecutionEnabled(deps.checkStop());deps.checkPolicy();
     const output=await deps.provider(task);assertSafePayload(output);return output;
    });
   });
   reason="persistence";
   if(!result.grounded)throw Error("Review not grounded");
   await deps.commit(r.jobId,result);
   // Commit may already be durable; a failed post-commit audit is reconciliation, not rollback.
   await emit("completed","none");
   return result;
  }catch(e){await r.fail();throw e;}
 }catch(e){await emit("blocked",reason);throw e;}
}
