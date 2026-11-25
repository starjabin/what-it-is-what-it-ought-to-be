/** Staging-only orchestration core. No database writes or approval tools. */
export type Role = "evidence" | "contract" | "gap-risk" | "quality";
export type RecordRef = { id: string; text: string };
export type Review = { summary: string; evidenceIds: string[]; obligationIds: string[]; missing: string[] };
export type Task = { role: Role; evidence: readonly RecordRef[]; obligations: readonly RecordRef[]; prior: readonly Review[]; maxOutputTokens: number; signal: AbortSignal };
export type Runner = (task: Task) => Promise<unknown>;
const MAX_BYTES = 48000;
const MAX_OUTPUT = 700;
const MAX_CALLS = 4;
const validText = (v: unknown): v is string => typeof v === "string" && v.length <= 3000;
function refs(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value) || value.length > 100 || value.some(id => typeof id !== "string" || !allowed.has(id))) throw new Error("Invalid scoped reference");
  return [...new Set<string>(value)];
}
function validate(value: unknown, e: Set<string>, o: Set<string>): Review {
  if (!value || typeof value !== "object") throw new Error("Invalid specialist result");
  const v = value as Record<string, unknown>;
  if (!validText(v.summary) || !v.summary.trim() || !Array.isArray(v.missing) || v.missing.length > 20 || !v.missing.every(validText)) throw new Error("Invalid specialist result");
  return { summary: v.summary, evidenceIds: refs(v.evidenceIds, e), obligationIds: refs(v.obligationIds, o), missing: v.missing };
}
export async function executeReview(input: { evidence: readonly RecordRef[]; obligations: readonly RecordRef[] }, runner: Runner, timeoutMs = 20000) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error("Invalid timeout");
  const evidence = input.evidence.map(r => ({id:r.id,text:r.text}));
  const obligations = input.obligations.map(r => ({id:r.id,text:r.text}));
  if (!evidence.length || !obligations.length || new TextEncoder().encode(JSON.stringify({evidence, obligations})).length > MAX_BYTES) throw new Error("Missing or oversized review input");
  const e = new Set(evidence.map(r=>r.id)), o = new Set(obligations.map(r=>r.id));
  if (e.size !== evidence.length || o.size !== obligations.length || [...e,...o].some(id=>!id.trim())) throw new Error("Duplicate or blank source IDs");
  let calls = 0;
  async function step(role: Role, prior: readonly Review[]): Promise<Review> {
    if (++calls > MAX_CALLS) throw new Error("Call cap exceeded");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve().then(()=>runner({role, evidence: structuredClone(evidence), obligations: structuredClone(obligations), prior: structuredClone(prior), maxOutputTokens:MAX_OUTPUT, signal:controller.signal})),
        new Promise<never>((_, reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error("Specialist timeout"));},timeoutMs)})
      ]);
      return validate(result,e,o);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }
  const initial = await Promise.allSettled([step("evidence", []), step("contract", [])]);
  if (initial[0].status !== "fulfilled" || initial[1].status !== "fulfilled") throw new Error("Specialist review incomplete");
  const first = [initial[0].value, initial[1].value];
  const gap = await step("gap-risk", first);
  const quality = await step("quality", [...first,gap]);
  const grounded = gap.evidenceIds.length > 0 && gap.obligationIds.length > 0 && quality.evidenceIds.length > 0 && quality.obligationIds.length > 0;
  return { status: "Under Review" as const, calls, grounded, reviews: { evidence:first[0], contract:first[1], gap, quality } };
}
