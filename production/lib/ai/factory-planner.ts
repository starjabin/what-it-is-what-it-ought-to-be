/** Development planning policy, not a model/tool dispatcher or independent certification. */
export const QUALITY_GATES=[
 "scope-and-evidence","architecture-and-dependencies","design-system","accessibility","responsive-browser","api-and-data-contract","security-and-privacy","performance","regression-and-recovery","independent-release-review"
] as const;
export type QualityGate=typeof QUALITY_GATES[number];
export type Evidence={gate:QualityGate;status:"passed"|"failed"|"not-tested";reference:string};
export function evaluatePlan(evidence:readonly Evidence[]):{readyForReview:boolean;missing:QualityGate[]}{
 const missing=QUALITY_GATES.filter(g=>{const matches=evidence.filter(x=>x.gate===g);return matches.length!==1||matches[0].status!=="passed"||!matches[0].reference.trim()});
 return {readyForReview:missing.length===0,missing};
}
export const PLANNER_PROFILE={version:"2.0",references:["ISO/IEC 25010:2023","WCAG 2.2 AA","OWASP ASVS 5.0","NIST SSDF SP 800-218","Core Web Vitals"],viewports:[320,375,768,1024,1440],performanceTargets:{lcpMs:2500,inpMs:200,cls:0.1},maxRepairAttempts:2,releaseAuthority:"independent-human",productionMutation:false} as const;
