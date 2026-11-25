/**
 * Pure, read-only agent planning and citation validation.
 * Planning does not grant tool access or represent executed agents.
 */
export const AGENTS = [
  { id: "evidence", mandate: "Check source revisions, evidence completeness and locators." },
  { id: "contract", mandate: "Identify applicable obligations and potential contradictions." },
  { id: "engineering", mandate: "Identify technical inconsistencies; request missing drawings or specifications." },
  { id: "planning", mandate: "Identify affected activities and milestones; do not invent dates." },
  { id: "procurement", mandate: "Identify procurement requirements and evidence of delivery." },
  { id: "construction", mandate: "Check installation, dismantling, testing and commissioning prerequisites." },
  { id: "gap-risk", mandate: "Compare evidence with obligations; distinguish uncertainty and impact." },
  { id: "commercial", mandate: "Identify potential commercial impacts; no claims or commitments." },
  { id: "quality", mandate: "Check whether cited records support the proposal; no approval authority." },
  { id: "security", mandate: "Identify missing controls; no privileged tools or production changes." },
] as const;

export type AgentId = typeof AGENTS[number]["id"];

export function planGapReview(): readonly AgentId[] {
  // The current endpoint uses one model call, not autonomous specialist execution.
  // Review disciplines are fixed by trusted server code, not uploaded instructions.
  return ["evidence", "contract", "gap-risk", "quality"];
}

export function reviewInstructions(): string {
  const selected = new Set<AgentId>(planGapReview());
  return AGENTS.filter(a => selected.has(a.id))
    .map(a => a.id + ": " + a.mandate).join("\n");
}

export function validateEvidenceIds(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("A gap candidate needs at least one reviewed evidence reference.");
  }
  const unique = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string" || !allowed.has(id)) {
      throw new Error("Unrecognized evidence reference in AI output.");
    }
    unique.add(id);
  }
  return [...unique];
}
