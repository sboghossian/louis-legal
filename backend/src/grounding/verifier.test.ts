/**
 * Deterministic tests for the zero-LLM grounding verifier (AC2).
 *
 * RUNNER NOTE: written for vitest, the runner standardized on during Processor
 * v2 integration (vitest is installed and configured in `vitest.config.ts`).
 * The original draft used `node:test` under a worktree-local "no network"
 * assumption; on the integration machine vitest installs fine, so these tests
 * use vitest's `test`/`expect` to run alongside the cost-governor and memory
 * suites under a single `npx vitest run`.
 *
 * Run: cd backend && npx vitest run src/grounding/verifier.test.ts
 */
import { test, expect } from "vitest";
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
  expect(r.quotesChecked).toBe(1);
  expect(r.refsChecked).toBe(0);
  expect(r.matched.length).toBe(1);
  expect(r.unmatched.length).toBe(0);
  expect(r.score).toBe(1);
});

test("quote absent from doc is unmatched and drops the score", () => {
  const r = run('The clause says "the moon is made of green cheese always".');
  expect(r.quotesChecked).toBe(1);
  expect(r.matched.length).toBe(0);
  expect(r.unmatched).toEqual(["the moon is made of green cheese always"]);
  expect(r.score).toBe(0);
});

test("a valid Section X reference is credited", () => {
  const r = run("As established in Section 5.2, liability is capped.");
  expect(r.refsChecked).toBe(1);
  expect(r.quotesChecked).toBe(0);
  expect(r.matched).toEqual(["5.2"]);
  expect(r.score).toBe(1);
});

test("an absent section reference is unmatched", () => {
  const r = run("See Section 9.9 for the indemnity carve-out.");
  expect(r.refsChecked).toBe(1);
  expect(r.unmatched).toEqual(["9.9"]);
  expect(r.score).toBe(0);
});

test("a Clause X reference present only in raw text is credited", () => {
  const r = run("Confidentiality is governed by Clause 3.");
  expect(r.refsChecked).toBe(1);
  expect(r.matched).toEqual(["3"]);
  expect(r.score).toBe(1);
});

test("a boilerplate-only quote is NOT credited (treated as nothing to check)", () => {
  const r = run('The contract states "in no event shall".');
  // Boilerplate-only quotes are excluded before counting -> nothing checkable.
  expect(r.quotesChecked).toBe(0);
  expect(r.refsChecked).toBe(0);
  expect(r.matched.length).toBe(0);
  expect(r.unmatched.length).toBe(0);
  expect(r.score).toBe(1); // vacuously grounded
});

test("a longer quote that merely CONTAINS boilerplate IS credited", () => {
  const r = run(
    'It provides that "in no event shall the Provider be liable for indirect damages".',
  );
  expect(r.quotesChecked).toBe(1);
  expect(r.matched.length).toBe(1);
  expect(r.score).toBe(1);
});

test("matching is case-insensitive for quotes and refs", () => {
  const r = run('Per SECTION 5.2 it says "IN NO EVENT SHALL THE PROVIDER BE LIABLE FOR INDIRECT DAMAGES".');
  expect(r.refsChecked).toBe(1);
  expect(r.quotesChecked).toBe(1);
  expect(r.unmatched.length).toBe(0);
  expect(r.score).toBe(1);
});

test("mixed grounded + ungrounded citations yield a fractional score", () => {
  const r = run(
    'Section 5.2 caps liability, but "this exact phrase does not appear anywhere".',
  );
  expect(r.refsChecked).toBe(1);
  expect(r.quotesChecked).toBe(1);
  expect(r.matched.length).toBe(1); // the ref
  expect(r.unmatched.length).toBe(1); // the bogus quote
  expect(r.score).toBe(0.5);
});

test("empty input scores 1 (vacuously grounded)", () => {
  const r = run("", { text: "", headings: [], sectionRefs: [] });
  expect(r.quotesChecked).toBe(0);
  expect(r.refsChecked).toBe(0);
  expect(r.matched.length).toBe(0);
  expect(r.unmatched.length).toBe(0);
  expect(r.score).toBe(1);
});

test("a finding with prose but no citations scores 1", () => {
  const r = run("This agreement appears one-sided and favors the provider.");
  expect(r.quotesChecked).toBe(0);
  expect(r.refsChecked).toBe(0);
  expect(r.score).toBe(1);
});

test("optional document fields may be omitted (only text provided)", () => {
  const r = run("Confidentiality is governed by Clause 3.", { text: DOC_TEXT });
  expect(r.matched).toEqual(["3"]);
  expect(r.score).toBe(1);
});
