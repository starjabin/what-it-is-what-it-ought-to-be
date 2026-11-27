/** Native factory work-cell reconciliation. Pure policy, not a background worker or release approval. */
export const FACTORY_CELLS=["identity-tenant","evidence-contracts","ai-expenditure","visual-planning","security-assurance","delivery-commercial"] as const;
export type CellId=typeof FACTORY_CELLS[number];
export type Phase="planner"|"coder"|"tester"|"reviewer";
export type PhaseState="verified"|"implemented-untested"|"blocked"|"not-applicable";
export type CellRecord={cell:CellId;phases:Record<Phase,{state:PhaseState;reference:string}>;blocker:string;nextAction:string;repairAttempts:number};
export function reconcileFactory(records:readonly CellRecord[]){
 const validPhases=["verified","implemented-untested","blocked","not-applicable"];
 const phases=["planner","coder","tester","reviewer"] as const;
 if(records.length!==FACTORY_CELLS.length||new Set(records.map(r=>r.cell)).size!==FACTORY_CELLS.length||records.some(r=>!FACTORY_CELLS.includes(r.cell)))throw Error("Each factory cell must appear once");
 for(const r of records){
  if(!Number.isInteger(r.repairAttempts)||r.repairAttempts<0||r.repairAttempts>2||!r.nextAction.trim())throw Error("Invalid bounded cycle");
  for(const p of phases){const x=r.phases[p];if(!x||!validPhases.includes(x.state)||!x.reference.trim())throw Error("Missing phase evidence")}
  if(phases.some(p=>r.phases[p].state!=="verified")&&!r.blocker.trim())throw Error("Record outstanding acceptance or blocker");
 }
 const pending=records.filter(r=>phases.some(p=>r.phases[p].state!=="verified")||r.blocker.trim()).map(r=>r.cell);
 return {cellsReconciled:records.length,pending,readyForIndependentReview:pending.length===0,productionAuthorized:false as const};
}
