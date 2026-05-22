/**
 * Tests for the auto-brief intake module.
 *
 * All tests are:
 *   - Synchronous where possible (pure functions).
 *   - Zero-network: the fake LLM never hits a real endpoint.
 *   - Deterministic: no Date.now() or random usage.
 */
import { describe, it, expect, vi } from "vitest";

import {
  shouldAutoBrief,
  buildAutoBriefPrompt,
  buildAutoBrief,
  SHORT_MESSAGE_WORD_THRESHOLD,
  PER_DOC_CHAR_CAP,
  TOTAL_DOC_CHAR_CAP,
} from "./autoBrief";
import type { BriefDocument, LlmFn } from "./autoBrief";

// ---------------------------------------------------------------------------
// shouldAutoBrief — truth table
// ---------------------------------------------------------------------------

describe("shouldAutoBrief", () => {
  // --- true cases -----------------------------------------------------------

  it("returns true for a short message (≤ threshold words) with one doc", () => {
    expect(
      shouldAutoBrief({ message: "review this contract", attachedDocCount: 1 }),
    ).toBe(true);
  });

  it("returns true for a short message with multiple docs", () => {
    expect(
      shouldAutoBrief({ message: "check these", attachedDocCount: 3 }),
    ).toBe(true);
  });

  it("returns true when message is exactly SHORT_MESSAGE_WORD_THRESHOLD words", () => {
    const msg = Array.from({ length: SHORT_MESSAGE_WORD_THRESHOLD }, (_, i) => `word${i}`).join(" ");
    expect(shouldAutoBrief({ message: msg, attachedDocCount: 1 })).toBe(true);
  });

  it("returns true for a stub phrase even when word count exceeds threshold", () => {
    // Construct a message that is longer than the threshold but contains a stub phrase.
    const prefix = Array.from({ length: SHORT_MESSAGE_WORD_THRESHOLD + 5 }, (_, i) => `extra${i}`).join(" ");
    const msg = `${prefix} thoughts?`;
    expect(shouldAutoBrief({ message: msg, attachedDocCount: 1 })).toBe(true);
  });

  it('returns true for "look at this" stub phrase', () => {
    expect(
      shouldAutoBrief({ message: "look at this", attachedDocCount: 2 }),
    ).toBe(true);
  });

  it('returns true for "what do you think" stub phrase', () => {
    expect(
      shouldAutoBrief({
        message: "what do you think about this",
        attachedDocCount: 1,
      }),
    ).toBe(true);
  });

  it('returns true for "can you review" stub phrase', () => {
    expect(
      shouldAutoBrief({ message: "can you review this please?", attachedDocCount: 1 }),
    ).toBe(true);
  });

  it("returns true for an empty message (0 words) with docs attached", () => {
    expect(shouldAutoBrief({ message: "", attachedDocCount: 1 })).toBe(true);
  });

  // --- false cases ----------------------------------------------------------

  it("returns false for a long message even with docs attached", () => {
    const longMsg = Array.from(
      { length: SHORT_MESSAGE_WORD_THRESHOLD + 10 },
      (_, i) => `word${i}`,
    ).join(" ");
    expect(shouldAutoBrief({ message: longMsg, attachedDocCount: 2 })).toBe(false);
  });

  it("returns false for a short message with zero docs", () => {
    expect(
      shouldAutoBrief({ message: "review this", attachedDocCount: 0 }),
    ).toBe(false);
  });

  it("returns false for a long question with zero docs", () => {
    const longMsg = "Can you please explain the indemnification clause in the context of DIFC law and its interaction with common law principles?";
    expect(shouldAutoBrief({ message: longMsg, attachedDocCount: 0 })).toBe(false);
  });

  it("returns false for a long non-stub message even with docs", () => {
    // More than threshold words, no stub phrase
    const msg =
      "Please analyse the termination clause in section 12 of the attached agreement, considering UAE law and the DIFC court's precedents on automatic termination events without notice.";
    expect(shouldAutoBrief({ message: msg, attachedDocCount: 1 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildAutoBriefPrompt — structure + length bounds
// ---------------------------------------------------------------------------

describe("buildAutoBriefPrompt", () => {
  const sampleDocs: BriefDocument[] = [
    { filename: "cover-letter.pdf", text: "Dear Counsel, please review the attached NDA." },
    { filename: "nda-draft.docx", text: "Non-Disclosure Agreement between Party A and Party B." },
  ];

  it("includes both filenames in the output", () => {
    const prompt = buildAutoBriefPrompt({ message: "review this", documents: sampleDocs });
    expect(prompt).toContain("cover-letter.pdf");
    expect(prompt).toContain("nda-draft.docx");
  });

  it("includes the user's message in the output", () => {
    const prompt = buildAutoBriefPrompt({ message: "review this", documents: sampleDocs });
    expect(prompt).toContain("review this");
  });

  it("includes document text in the output", () => {
    const prompt = buildAutoBriefPrompt({ message: "any thoughts?", documents: sampleDocs });
    expect(prompt).toContain("Non-Disclosure Agreement");
  });

  it("replaces blank message with (blank) placeholder", () => {
    const prompt = buildAutoBriefPrompt({ message: "", documents: sampleDocs });
    expect(prompt).toContain("(blank)");
  });

  it("handles an empty documents array gracefully", () => {
    const prompt = buildAutoBriefPrompt({ message: "review this", documents: [] });
    expect(prompt).toContain("no document text available");
  });

  it("clips a single document that exceeds PER_DOC_CHAR_CAP", () => {
    const hugeDocs: BriefDocument[] = [
      { filename: "huge.pdf", text: "x".repeat(PER_DOC_CHAR_CAP + 5_000) },
    ];
    const prompt = buildAutoBriefPrompt({ message: "review this", documents: hugeDocs });
    // The prompt should contain the clip marker
    expect(prompt).toContain("[…]");
    // And the prompt should not contain the raw oversize text (the doc text portion
    // is bounded; we verify the prompt length is within a reasonable bound)
    const docSectionStart = prompt.indexOf("## Attached documents");
    const docSection = prompt.slice(docSectionStart);
    expect(docSection.length).toBeLessThan(PER_DOC_CHAR_CAP + 2_000); // headings/labels overhead
  });

  it("clips aggregate text across multiple large documents to TOTAL_DOC_CHAR_CAP", () => {
    // Five docs each larger than PER_DOC_CHAR_CAP
    const manyDocs: BriefDocument[] = Array.from({ length: 5 }, (_, i) => ({
      filename: `doc-${i}.pdf`,
      text: "y".repeat(PER_DOC_CHAR_CAP + 1_000),
    }));
    const prompt = buildAutoBriefPrompt({ message: "check these", documents: manyDocs });
    // Extract just the attached-docs section for the length check
    const docSectionStart = prompt.indexOf("## Attached documents");
    const docSection = prompt.slice(docSectionStart);
    // Should be well within total cap plus reasonable label overhead
    expect(docSection.length).toBeLessThan(TOTAL_DOC_CHAR_CAP + 5_000);
  });

  it("includes 'Document 1' and 'Document 2' labels for two-doc input", () => {
    const prompt = buildAutoBriefPrompt({ message: "review this", documents: sampleDocs });
    expect(prompt).toContain("Document 1:");
    expect(prompt).toContain("Document 2:");
  });
});

// ---------------------------------------------------------------------------
// buildAutoBrief — integration with injected fake LLM
// ---------------------------------------------------------------------------

describe("buildAutoBrief", () => {
  const fakeBrief =
    "Acting for Party A in an NDA with Party B. Core ask: confirm mutual confidentiality obligations. Jurisdiction: DIFC. No deadline stated.";

  const fakeLlm: LlmFn = vi.fn().mockResolvedValue(fakeBrief);

  const docs: BriefDocument[] = [
    { filename: "nda.pdf", text: "NDA between Party A and Party B covering confidential information." },
  ];

  it("returns the fake LLM's response (trimmed)", async () => {
    const result = await buildAutoBrief({ message: "thoughts?", documents: docs, llm: fakeLlm });
    expect(result).toBe(fakeBrief.trim());
  });

  it("calls the injected llm exactly once", async () => {
    const spy: LlmFn = vi.fn().mockResolvedValue(fakeBrief);
    await buildAutoBrief({ message: "review this", documents: docs, llm: spy });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("passes a non-empty prompt string to the llm", async () => {
    const spy: LlmFn = vi.fn().mockResolvedValue(fakeBrief);
    await buildAutoBrief({ message: "any thoughts?", documents: docs, llm: spy });
    const [promptArg] = (spy as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(typeof promptArg).toBe("string");
    expect(promptArg.length).toBeGreaterThan(50);
  });

  it("trims leading/trailing whitespace from the llm response", async () => {
    const paddedLlm: LlmFn = vi.fn().mockResolvedValue(`  \n${fakeBrief}\n  `);
    const result = await buildAutoBrief({ message: "check this", documents: docs, llm: paddedLlm });
    expect(result).toBe(fakeBrief);
  });

  it("propagates errors thrown by the llm (caller owns safe-fail)", async () => {
    const errorLlm: LlmFn = vi.fn().mockRejectedValue(new Error("model timeout"));
    await expect(
      buildAutoBrief({ message: "review this", documents: docs, llm: errorLlm }),
    ).rejects.toThrow("model timeout");
  });
});
