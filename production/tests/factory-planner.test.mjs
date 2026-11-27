import test from "node:test";
import assert from "node:assert/strict";
import {QUALITY_GATES,evaluatePlan,PLANNER_PROFILE} from "../lib/ai/factory-planner.ts";
test("no evidence never ready",()=>assert.equal(evaluatePlan([]).missing.length,10));
test("all unique passed evidence required",()=>{const a=QUALITY_GATES.map(gate=>({gate,status:"passed",reference:"synthetic test ref"}));assert.equal(evaluatePlan(a).readyForReview,true);assert.equal(evaluatePlan([...a,a[0]]).readyForReview,false);assert.equal(evaluatePlan(a.map(x=>({...x,reference:""}))).readyForReview,false)});
test("failed and untested gates remain missing",()=>assert.equal(evaluatePlan([{gate:"accessibility",status:"not-tested",reference:"planned"}]).readyForReview,false));
test("planner bounded and human release",()=>{assert.equal(PLANNER_PROFILE.maxRepairAttempts,2);assert.equal(PLANNER_PROFILE.releaseAuthority,"independent-human");assert.equal(PLANNER_PROFILE.productionMutation,false)});
