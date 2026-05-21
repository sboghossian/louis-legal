/**
 * Deterministic tests for the zero-LLM grounding verifier (AC2).
 *
 * RUNNER NOTE: AC2 asked for vitest, but vitest is not installed in this repo
 * (node_modules is a shared symlink; ZERO-network constraint forbids installing
 * it). The codebase's actual test convention is Node's built-in test runner via
 * tsx (see `src/skills/_llm-classifier.test.ts`), which is also dependency-free
 * and on-brand for AC2's "Node stdlib only" mandate. These tests therefore use
 * `node:test` + `node:assert`. They are written so the describe/it/expect shape
 * maps 1:1 onto vitest if vitest is later added.
 *
 * Run: cd backend && npx tsx --test src/grounding/verifier.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyGrounding } from "./verifier";
import type { GroundingDocument, GroundingInput } from "./types";

const DOC_TEXT = [
  "5.1 Term. This Agreement commences on the Effective Date.",
  "5.2 Limitation of Liability. In no event shall the Provider be liable for",
  "indirect damages exceeding the fees paid in the prior twelve months.",
  "Clause 3 sets out the confidentiality obligations of each party.",
].join("\n");

const baseDoc: GroundingDocument = {
  text: DOC_TEXT,
  headings: ["5.1 Term", "5.2 Limitation of Liability"],
  sectionRefs: ["5.1", "5.2"],
};

function run(
  findingText: string,
  doc: GroundingDocument = baseDoc,
): ReturnType<typeof verifyGrounding> {
  const input: GroundingInput = { findingText, document: doc };
  return verifyGrounding(input);
}

test("exact-quote match is credited and scores 1", () => {
  const r = run('The provider relies on "indirect damages exceeding the fees paid".');
  assert.equal(r.quotesChecked, 1);
  assert.equal(r.refsChecked, 0);
  assert.equal(r.matched.length, 1);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.score, 1);
});

test("quote absent from doc is unmatched and drops the score", () => {
  const r = run('The clause says "the moon is made of green cheese always".');
  assert.equal(r.quotesChecked, 1);
  assert.equal(r.matched.length, 0);
  assert.deepEqual(r.unmatched, ["the moon is made of green cheese always"]);
  assert.equal(r.score, 0);
});

test("a valid Section X reference is credited", () => {
  const r = run("As established in Section 5.2, liability is capped.");
  assert.equal(r.refsChecked, 1);
  assert.equal(r.quotesChecked, 0);
  assert.deepEqual(r.matched, ["5.2"]);
  assert.equal(r.score, 1);
});

test("an absent section reference is unmatched", () => {
  const r = run("See Section 9.9 for the indemnity carve-out.");
  assert.equal(r.refsChecked, 1);
  assert.deepEqual(r.unmatched, ["9.9"]);
  assert.equal(r.score, 0);
});

test("a Clause X reference present only in raw text is credited", () => {
  const r = run("Confidentiality is governed by Clause 3.");
  assert.equal(r.refsChecked, 1);
  assert.deepEqual(r.matched, ["3"]);
  assert.equal(r.score, 1);
});

test("a boilerplate-only quote is NOT credited (treated as nothing to check)", () => {
  const r = run('The contract states "in no event shall".');
  // Boilerplate-only quotes are excluded before counting -> nothing checkable.
  assert.equal(r.quotesChecked, 0);
  assert.equal(r.refsChecked, 0);
  assert.equal(r.matched.length, 0);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.score, 1); // vacuously grounded
});

test("a longer quote that merely CONTAINS boilerplate IS credited", () => {
  const r = run(
    'It provides that "in no event shall the Provider be liable for indirect damages".',
  );
  assert.equal(r.quotesChecked, 1);
  assert.equal(r.matched.length, 1);
  assert.equal(r.score, 1);
});

test("matching is case-insensitive for quotes and refs", () => {
  const r = run('Per SECTION 5.2 it says "IN NO EVENT SHALL THE PROVIDER BE LIABLE FOR INDIRECT DAMAGES".');
  assert.equal(r.refsChecked, 1);
  assert.equal(r.quotesChecked, 1);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.score, 1);
});

test("mixed grounded + ungrounded citations yield a fractional score", () => {
  const r = run(
    'Section 5.2 caps liability, but "this exact phrase does not appear anywhere".',
  );
  assert.equal(r.refsChecked, 1);
  assert.equal(r.quotesChecked, 1);
  assert.equal(r.matched.length, 1); // the ref
  assert.equal(r.unmatched.length, 1); // the bogus quote
  assert.equal(r.score, 0.5);
});

test("empty input scores 1 (vacuously grounded)", () => {
  const r = run("", { text: "", headings: [], sectionRefs: [] });
  assert.equal(r.quotesChecked, 0);
  assert.equal(r.refsChecked, 0);
  assert.equal(r.matched.length, 0);
  assert.equal(r.unmatched.length, 0);
  assert.equal(r.score, 1);
});

test("a finding with prose but no citations scores 1", () => {
  const r = run("This agreement appears one-sided and favors the provider.");
  assert.equal(r.quotesChecked, 0);
  assert.equal(r.refsChecked, 0);
  assert.equal(r.score, 1);
});

test("optional document fields may be omitted (only text provided)", () => {
  const r = run("Confidentiality is governed by Clause 3.", { text: DOC_TEXT });
  assert.deepEqual(r.matched, ["3"]);
  assert.equal(r.score, 1);
});
