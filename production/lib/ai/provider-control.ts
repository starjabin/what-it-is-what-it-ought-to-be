/** Provider routing is fail-closed. Server supplies approved providers and a durable reservation. */
export type Attempt<T> = { id: string; invoke: (signal: AbortSignal) => Promise<T> };
export type Reservation = { consume: (provider: string) => Promise<void> };
export class ProviderUnavailable extends Error {}
export async function controlledAttempt<T>(
  primary: Attempt<T>, secondary: Attempt<T> | null,
  approvedProviders: ReadonlySet<string>, reservation: Reservation,
  signal: AbortSignal, validate: (result: T) => T
): Promise<{provider:string; result:T}> {
  if (!primary.id || !approvedProviders.has(primary.id)) throw new Error("Provider not authorized");
  if (secondary && (secondary.id === primary.id || !approvedProviders.has(secondary.id))) throw new Error("Secondary provider not independently authorized");
  const invoke = async (p:Attempt<T>) => {
    signal.throwIfAborted();
    await reservation.consume(p.id);
    signal.throwIfAborted();
    const result = await p.invoke(signal);
    signal.throwIfAborted();
    return result;
  };
  let raw:T;
  let provider=primary.id;
  try { raw=await invoke(primary); }
  catch(error) {
    if (!(error instanceof ProviderUnavailable) || !secondary || signal.aborted) throw error;
    provider=secondary.id;
    raw=await invoke(secondary);
  }
  // Validation failure must never trigger fallback or conceal malformed results.
  return {provider,result:validate(raw)};
}
