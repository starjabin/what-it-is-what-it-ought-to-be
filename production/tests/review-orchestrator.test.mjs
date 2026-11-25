import test from "node:test";
import assert from "node:assert/strict";
import { executeReview } from "../lib/ai/review-orchestrator.ts";
const input = {evidence:[{id:"e1",text:"650 mm"}],obligations:[{id:"o1",text:"800 mm required"}]};
const valid = {summary:"Candidate discrepancy",evidenceIds:["e1"],obligationIds:["o1"],missing:[]};
test("four bounded calls; initial specialists independent and quality sees candidate", async()=>{
  const seen=[];
  const result=await executeReview(input,async task=>{seen.push([task.role,task.prior.length,task.maxOutputTokens]);return valid;});
  assert.deepEqual(seen,[["evidence",0,700],["contract",0,700],["gap-risk",2,700],["quality",3,700]]);
  assert.equal(result.calls,4);assert.equal(result.status,"Under Review");assert.equal(result.grounded,true);
});
test("reject unscoped references before synthesis",async()=>{
  const seen=[];
  await assert.rejects(executeReview(input,async t=>{seen.push(t.role);return {...valid,evidenceIds:["other-tenant"]};}));
  assert.deepEqual(seen,["evidence","contract"]);
});
test("failed specialist prevents downstream execution",async()=>{
  const seen=[];
  await assert.rejects(executeReview(input,async t=>{seen.push(t.role);if(t.role==="contract")throw Error("provider");return valid;}));
  assert.equal(seen.length,2);
});
test("timeout aborts the runner and blocks downstream review",async()=>{
  let aborted=0;
  await assert.rejects(executeReview(input,t=>new Promise(()=>t.signal.addEventListener("abort",()=>aborted++)),10));
  assert.equal(aborted,2);
});
test("missing citations stay under review, not grounded",async()=>{
  const r=await executeReview(input,async()=>({...valid,evidenceIds:[],obligationIds:[]}));
  assert.equal(r.grounded,false);assert.equal(r.status,"Under Review");
});
test("oversized source fails before provider calls",async()=>{
  let calls=0;
  await assert.rejects(executeReview({...input,evidence:[{id:"e1",text:"x".repeat(49000)}]},async()=>{calls++;return valid;}));
  assert.equal(calls,0);
});
test("mutating one runner input cannot alter the other or original",async()=>{
  await executeReview(input,async t=>{assert.equal(t.evidence[0].text,"650 mm");t.evidence[0].text="changed";return valid;});
  assert.equal(input.evidence[0].text,"650 mm");
});
