/** Server-owned authorization. Callers must supply verified identity and database-derived membership. */
export type Scope={actorId:string;orgId:string;contractId:string;role:string;environment:string;classification:string;projectId:string};
export type ScopedRecord={id:string;orgId:string;contractId:string;projectId:string;current:boolean;ready:boolean;text:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function authorizeReview(scope:Scope, actor:string, contract:{id:string;orgId:string;projectId:string}, records:readonly ScopedRecord[]):void {
  if(![scope.actorId,scope.orgId,scope.contractId,scope.projectId].every(s=>uuid.test(s))||scope.actorId!==actor||scope.contractId!==contract.id||scope.orgId!==contract.orgId||scope.projectId!==contract.projectId)throw Error("Scope denied");
  if(scope.environment!=="staging"||!["owner","admin","contract_manager","contributor","reviewer"].includes(scope.role)||!["public","synthetic"].includes(scope.classification))throw Error("Review policy denied");
  if(!records.length||records.some(r=>r.orgId!==scope.orgId||r.contractId!==scope.contractId||r.projectId!==scope.projectId||r.current!==true||r.ready!==true||!uuid.test(r.id)))throw Error("Record scope denied");
}
export function assertIndependentApproval(actorId:string,reviewerId:string,role:string):void {
 if(!uuid.test(actorId)||!uuid.test(reviewerId)||actorId.toLowerCase()===reviewerId.toLowerCase()||!["owner","admin","reviewer"].includes(role))throw Error("Independent approval denied");
}
/** No filesystem, shell, network tools, external writes, or approval capabilities exposed to review agents. */
export function assertReviewCapability(capability:string):void {
 if(!["read-scoped-evidence","read-scoped-obligations","propose-under-review"].includes(capability))throw Error("Agent capability denied");
}
