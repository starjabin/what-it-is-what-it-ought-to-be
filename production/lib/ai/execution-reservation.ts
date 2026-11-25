/** Staging-only server orchestration boundary. Never expose this RPC client to the browser. */
export type Rpc = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
export type Reservation = { readonly jobId: string; consume(provider: string): Promise<void>; fail(): Promise<void> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function reserveExecution(rpc: Rpc, input: { contractId: string; verifiedActorId: string; requestId: string; attempts: number }): Promise<Reservation> {
  if (![input.contractId,input.verifiedActorId,input.requestId].every(x=>typeof x === 'string' && uuid.test(x)) || !Number.isInteger(input.attempts) || input.attempts < 1 || input.attempts > 8) throw new Error('Invalid execution reservation');
  const result = await rpc('reserve_controlled_ai',{p_contract:input.contractId,p_actor:input.verifiedActorId,p_request:input.requestId,p_attempts:input.attempts});
  if (result.error || typeof result.data !== 'string' || !uuid.test(result.data)) throw new Error('Execution reservation denied');
  const jobId = result.data;
  return {jobId, async consume(provider) {
    if (typeof provider !== 'string' || !provider.trim() || provider.length>100) throw new Error('Invalid provider');
    const r=await rpc('consume_controlled_ai',{p_job:jobId,p_provider:provider});
    if (r.error) throw new Error('Execution attempt denied');
  }, async fail() {
    const r=await rpc('fail_controlled_ai',{p_job:jobId});
    if (r.error) throw new Error('Execution failure recording failed');
  }};
}
/** No provider dispatch until the durable reservation AND attempt debit succeed. */
export async function runReserved<T>(rpc: Rpc, input: Parameters<typeof reserveExecution>[1], run: (r: Reservation)=>Promise<T>, commit: (jobId:string,result:T)=>Promise<void>): Promise<T> {
  const reservation=await reserveExecution(rpc,input);
  try {
    const result=await run(reservation);
    await commit(reservation.jobId,result);
    return result;
  } catch(error) {
    try { await reservation.fail(); } catch { throw new Error('Execution failed; reservation reconciliation required'); }
    throw error;
  }
}
export async function invokeReserved<T>(r: Reservation, provider:string, signal:AbortSignal, invoke:()=>Promise<T>):Promise<T> {
  signal.throwIfAborted();
  await r.consume(provider);
  signal.throwIfAborted();
  return invoke();
}
