import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveExecution,runReserved,invokeReserved} from '../lib/ai/execution-reservation.ts';
const id='12345678-1234-1234-1234-123456789abc';
const input={contractId:id,verifiedActorId:id,requestId:id,attempts:4};
const signal=()=>new AbortController().signal;
function fake({denyReserve=false,denyDebit=false,denyFail=false}={}) {
 const events=[];const rpc=async(name,args)=>{events.push(name);return {data:name==='reserve_controlled_ai'?id:null,error:(name==='reserve_controlled_ai'&&denyReserve)||(name==='consume_controlled_ai'&&denyDebit)||(name==='fail_controlled_ai'&&denyFail)?'denied':null};};return {rpc,events};
}
test('reserve, debit, invoke, commit in order',async()=>{const f=fake();const result=await runReserved(f.rpc,input,r=>invokeReserved(r,'openai',signal(),async()=>{f.events.push('provider');return 42;}),async(job,value)=>{assert.equal(job,id);assert.equal(value,42);f.events.push('commit');});assert.equal(result,42);assert.deepEqual(f.events,['reserve_controlled_ai','consume_controlled_ai','provider','commit']);});
test('denied reservation never starts run',async()=>{const f=fake({denyReserve:true});await assert.rejects(runReserved(f.rpc,input,async()=>assert.fail('dispatch'),async()=>assert.fail('commit')));assert.deepEqual(f.events,['reserve_controlled_ai']);});
test('denied debit never sends request; closes failed job',async()=>{const f=fake({denyDebit:true});await assert.rejects(runReserved(f.rpc,input,r=>invokeReserved(r,'openai',signal(),async()=>assert.fail('provider')),async()=>assert.fail('commit')));assert.deepEqual(f.events,['reserve_controlled_ai','consume_controlled_ai','fail_controlled_ai']);});
test('provider error closes failed job and never commits',async()=>{const f=fake();await assert.rejects(runReserved(f.rpc,input,r=>invokeReserved(r,'openai',signal(),async()=>{throw Error('provider error');}),async()=>assert.fail('commit')),/provider error/);assert.equal(f.events.at(-1),'fail_controlled_ai');});
test('bad reservation input never calls database',async()=>{const f=fake();for(const attempts of [0,9,1.5,NaN])await assert.rejects(reserveExecution(f.rpc,{...input,attempts}));await assert.rejects(reserveExecution(f.rpc,{...input,verifiedActorId:'unverified'}));assert.equal(f.events.length,0);});
test('cancelled request does not debit',async()=>{const f=fake();const r=await reserveExecution(f.rpc,input);const c=new AbortController();c.abort();await assert.rejects(invokeReserved(r,'openai',c.signal,async()=>assert.fail()));assert.deepEqual(f.events,['reserve_controlled_ai']);});
test('failure recording error raises reconciliation requirement',async()=>{const f=fake({denyFail:true});await assert.rejects(runReserved(f.rpc,input,async()=>{throw Error('failed');},async()=>assert.fail()),/reconciliation required/);});
test('ambiguous commit error fails closed',async()=>{const f=fake();await assert.rejects(runReserved(f.rpc,input,async()=>42,async()=>{throw Error('commit response lost');}),/commit response lost/);assert.equal(f.events.at(-1),'fail_controlled_ai');});
