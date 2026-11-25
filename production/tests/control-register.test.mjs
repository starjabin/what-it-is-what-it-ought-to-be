import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkControls} from "../security/check-control-register.mjs";
const register=JSON.parse(readFileSync(new URL("../security/control-register.json",import.meta.url),"utf8"));
test("all ten control packages tracked; release held",()=>{assert.equal(checkControls(register).controls,10);assert.throws(()=>checkControls(register,true),/unaccepted controls/);});
test("omitted and duplicate control fail",()=>{let r=structuredClone(register);r.controls.pop();assert.throws(()=>checkControls(r));r=structuredClone(register);r.controls[1]=r.controls[0];assert.throws(()=>checkControls(r));});
test("claimed acceptance without independent evidence rejected",()=>{const r=structuredClone(register);r.controls[0].status="accepted";assert.throws(()=>checkControls(r));r.controls[0].acceptance={reviewedBy:"same",implementedBy:"SAME",evidence:["one","two","three"]};assert.throws(()=>checkControls(r));});
