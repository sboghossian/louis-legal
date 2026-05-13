/**
 * MENA legal benchmark — runs the same prompt through three different
 * system-prompt/skill stacks against Claude Opus 4.7.
 *
 * Variants:
 *   1. Mike upstream    — base Mike SYSTEM_PROMPT, no skills layer
 *   2. Louis            — Louis SYSTEM_PROMPT + skill-router systemPromptExtra
 *   3. Claude + legal plugins — Anthropic claude-for-legal corporate-legal CLAUDE.md
 *      with a minimally populated MENA-fintech practice profile
 *
 * Outputs are written to /tmp/benchmark-{mike,louis,claude-legal}.md
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { route } from "./src/skills/_router";
import { SYSTEM_PROMPT as LOUIS_SYSTEM_PROMPT } from "./src/lib/chatTools";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-opus-4-7";

const PROMPT = `Role: You are senior legal counsel advising a MENA-focused venture deal.

Facts:
- Client: UAE mainland LLC, fintech (payments orchestration), 18 months post-incorporation, no DFSA/ADGM licence yet — operating under a Central Bank of the UAE retail payment services exemption sandbox.
- Investment: USD 4M convertible instrument from a KSA-domiciled VC fund whose anchor LP is a PIF-backed fund of funds.
- Investor's term sheet demands: (a) SAFE-style post-money convertible, 20% discount, USD 25M valuation cap, MFN; (b) governing law = laws of the Kingdom of Saudi Arabia; (c) seat of arbitration = Riyadh, SCCA Rules, Arabic language, three arbitrators.
- Founders' counter: DIFC law, DIFC-LCIA (now DIAC post-2021 decree) seat, English language, sole arbitrator.
- Founders are Lebanese and Egyptian nationals. One co-founder will relocate to Riyadh to lead KSA go-to-market.

Deliverables (all four, in order):
1. Enforceability analysis of the SAFE structure under (i) UAE federal law and (ii) Saudi law, specifically addressing Sharia compatibility of the discount and valuation cap mechanics (riba, gharar). State your conclusion and cite the specific provisions or doctrines you rely on.
2. Forum analysis: Compare KSA-seated SCCA arbitration vs. DIAC (Dubai) seat for this deal. Address: enforcement of the award in the counterparty's home jurisdiction, interim relief availability, language/cost, and Riyadh Convention vs. New York Convention pathways.
3. Drafted clause: Provide a single dispute resolution clause you would propose as compromise — ready to drop into the SAFE. Include seat, rules, language, number of arbitrators, governing law, carve-outs for interim relief, and Sharia-compliance fallback if any. Black-letter drafting, no commentary inside the clause.
4. Top 3 deal risks ranked, each with a one-sentence mitigation. Be concrete (name the risk, don't gesture at it).

Constraints: Max 900 words total. No disclaimers. No "consult local counsel" hedging — give the answer a partner would sign.`;

// Mike upstream SYSTEM_PROMPT, pulled verbatim from willchen96/mike@main
// (backend/src/lib/chatTools.ts). Differs from Louis only in the name.
const MIKE_SYSTEM_PROMPT = LOUIS_SYSTEM_PROMPT.replace(
    /^You are Louis,/,
    "You are Mike,",
);

// Claude-for-legal corporate-legal CLAUDE.md, with placeholders briefly
// populated to match the MENA-fintech matter so the plugin doesn't refuse on
// the "configure first" gate.
const CLAUDE_LEGAL_PRACTICE_PROFILE = `# Corporate Practice Profile (test fixture)

## Company profile
**Entity name:** boutique MENA venture finance practice
**Industry / sector:** fintech and venture capital
**Stage:** private practice — boutique
**Primary jurisdiction:** UAE (mainland + DIFC), KSA, Lebanon, Egypt
**Legal team size:** 2 partners + 4 associates
**Escalation:** managing partner

**Practice setting:** Midsize/large firm (private practice)

## Who's using this
**Role:** Lawyer / legal professional
**Attorney contact:** N/A — partner is the signer

## Active modules
M&A active (early-stage VC + convertible instruments)

## Jurisdiction footprint
UAE federal + DIFC, KSA, GCC. Non-US — so the work-product header carries the
"work product is a US doctrine" caveat. Sharia-compliance analysis is in scope
for KSA-governed instruments.
`;

const CLAUDE_LEGAL_CLAUDE_MD = readFileSync(
    "/Users/stephanemacmini/Library/Mobile Documents/com~apple~CloudDocs/Documents/Code/claude-for-legal/corporate-legal/CLAUDE.md",
    "utf-8",
);

const CLAUDE_LEGAL_SYSTEM_PROMPT =
    `You are operating as the "claude-for-legal / corporate-legal" plugin. The
practice profile below is populated — do NOT trigger the cold-start gate.
Follow every guardrail in the plugin instructions (work-product header,
reviewer note, decision tree, tag vocabulary, jurisdiction recognition,
proportionality, source attribution).

----- PRACTICE PROFILE -----
${CLAUDE_LEGAL_PRACTICE_PROFILE}

----- PLUGIN INSTRUCTIONS (corporate-legal CLAUDE.md) -----
${CLAUDE_LEGAL_CLAUDE_MD}
`;

// Build Louis's actual system prompt the way chat.ts would.
function buildLouisSystemPrompt(userMessage: string): {
    system: string;
    routing: ReturnType<typeof route>;
} {
    const decision = route({
        message: userMessage,
        persona: "associate",
        surface: "web",
        hasDocuments: false,
    });
    let systemContent = LOUIS_SYSTEM_PROMPT;
    if (decision.systemPromptExtra) {
        systemContent += "\n\n" + decision.systemPromptExtra.trim();
    }
    return { system: systemContent, routing: decision };
}

async function runOne(
    apiKey: string,
    label: string,
    system: string,
    user: string,
): Promise<string> {
    process.stderr.write(`[${label}] starting (system: ${system.length} chars)\n`);
    const t0 = Date.now();
    const resp = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://louis.dashable.dev",
            "X-Title": "MENA legal benchmark",
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 4096,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`[${label}] HTTP ${resp.status}: ${body.slice(0, 500)}`);
    }
    const data = (await resp.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const text = data.choices?.[0]?.message?.content ?? "";
    process.stderr.write(
        `[${label}] done in ${dt}s — in=${data.usage?.prompt_tokens ?? "?"} out=${data.usage?.completion_tokens ?? "?"}\n`,
    );
    return text;
}

async function main() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

    const louis = buildLouisSystemPrompt(PROMPT);
    process.stderr.write(
        `[router] intent=${louis.routing.intent.primary} ` +
            `jurisdiction=${louis.routing.intent.jurisdiction ?? "-"} ` +
            `skills=${louis.routing.skillIds.length} ` +
            `extra=${louis.routing.systemPromptExtra.length} chars\n` +
            `[router] skillIds=${JSON.stringify(louis.routing.skillIds)}\n`,
    );

    const [mikeOut, louisOut, claudeLegalOut] = await Promise.all([
        runOne(apiKey, "mike", MIKE_SYSTEM_PROMPT, PROMPT),
        runOne(apiKey, "louis", louis.system, PROMPT),
        runOne(apiKey, "claude-legal", CLAUDE_LEGAL_SYSTEM_PROMPT, PROMPT),
    ]);

    writeFileSync("/tmp/benchmark-mike.md", mikeOut);
    writeFileSync("/tmp/benchmark-louis.md", louisOut);
    writeFileSync("/tmp/benchmark-claude-legal.md", claudeLegalOut);

    process.stderr.write("\n=== ALL DONE ===\n");
    process.stderr.write(`mike:         /tmp/benchmark-mike.md (${mikeOut.length} chars)\n`);
    process.stderr.write(`louis:        /tmp/benchmark-louis.md (${louisOut.length} chars)\n`);
    process.stderr.write(`claude-legal: /tmp/benchmark-claude-legal.md (${claudeLegalOut.length} chars)\n`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
