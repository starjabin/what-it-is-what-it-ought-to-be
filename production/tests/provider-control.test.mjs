import test from "node:test";
import assert from "node:assert/strict";
import {controlledAttempt,ProviderUnavailable} from "../lib/ai/provider-control.ts";
const signal=()=>new AbortController().signal;
const allowed=new Set(["p","s"]);
const ok={id:"s",invoke:async()=>42};
const fail={id:"p",invoke:async()=>{throw new ProviderUnavailable("outage");}};
const validate=x=>x;
test("approved fallback consumes a second reservation",async()=>{
 const seen=[];const r=await controlledAttempt(fail,ok,allowed,{consume:async id=>seen.push(id)},signal(),validate);
 assert.deepEqual(seen,["p","s"]);assert.deepEqual(r,{provider:"s",result:42});
});
test("unapproved provider cannot receive data",async()=>{
 let n=0;await assert.rejects(controlledAttempt(fail,ok,new Set(["p"]),{consume:async()=>n++},signal(),validate));assert.equal(n,0);
});
test("exhausted budget fails before sending",async()=>{
 let n=0;await assert.rejects(controlledAttempt({id:"p",invoke:async()=>++n},ok,allowed,{consume:async()=>{throw new ProviderUnavailable("reservation denied");}},signal(),validate));assert.equal(n,0);
});
test("validation failure does not trigger secondary",async()=>{
 const seen=[];await assert.rejects(controlledAttempt({id:"p",invoke:async()=>42},ok,allowed,{consume:async id=>seen.push(id)},signal(),()=>{throw Error("bad citations");}));assert.deepEqual(seen,["p"]);
});
test("non-outage error does not trigger secondary",async()=>{
 const seen=[];await assert.rejects(controlledAttempt({id:"p",invoke:async()=>{throw Error("authentication");}},ok,allowed,{consume:async id=>seen.push(id)},signal(),validate));assert.deepEqual(seen,["p"]);
});
test("aborted request never consumes a reservation",async()=>{
 const c=new AbortController();c.abort();let n=0;await assert.rejects(controlledAttempt(fail,ok,allowed,{consume:async()=>n++},c.signal,validate));assert.equal(n,0);
});
