import test from "node:test";
import assert from "node:assert/strict";
import { AGENTS, planGapReview, reviewInstructions, validateEvidenceIds } from "../lib/ai/agent-foundation.ts";

test("ten unique registered specialist mandates", () => {
  assert.equal(AGENTS.length, 10);
  assert.equal(new Set(AGENTS.map(a => a.id)).size, 10);
});
test("fixed bounded review plan contains registered read-only disciplines", () => {
  assert.deepEqual(planGapReview(), ["evidence", "contract", "gap-risk", "quality"]);
  assert.ok(planGapReview().every(id => AGENTS.some(a => a.id === id)));
  assert.match(reviewInstructions(), /quality:.*no approval authority/);
});
test("authorized references deduplicate without changing order", () => {
  assert.deepEqual(validateEvidenceIds(["b", "a", "b"], new Set(["a", "b"])), ["b", "a"]);
});
test("unknown and cross-scope references reject the entire proposal", () => {
  assert.throws(() => validateEvidenceIds(["a", "other-tenant"], new Set(["a"])));
});
test("empty, malformed and non-string references are rejected", () => {
  for (const input of [[], null, undefined, "a", [1], [{}]]) {
    assert.throws(() => validateEvidenceIds(input, new Set(["a"])));
  }
});
