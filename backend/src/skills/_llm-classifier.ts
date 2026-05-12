/**
 * LLM-based intent classifier — fallback path when the keyword router returns
 * low-confidence chitchat. Uses Gemini Flash (fast + cheap) and returns a
 * structured classification.
 *
 * Soft-fails: if Gemini is unavailable or the response is malformed, returns
 * undefined and the caller continues with the keyword decision.
 */
import { GoogleGenAI } from "@google/genai";
import { getSkill } from "./_loader";

export interface LLMClassification {
  primary: "drafting" | "review" | "research" | "summarize" | "translate" | "compare" | "calculate" | "advice" | "admin" | "chitchat";
  practiceArea?: string;
  jurisdiction?: string;
  language?: "en" | "ar" | "fr";
  confidence: number;
}

const MODEL = process.env.SKILLS_CLASSIFIER_MODEL ?? "gemini-2.5-flash";

function buildSystemPrompt(): string {
  // Compose from existing router skills so the LLM uses the same definitions.
  const intent = getSkill("router.intent-detection");
  const practice = getSkill("router.practice-area-detector");
  const juris = getSkill("router.jurisdiction-detector");
  const parts: string[] = [];
  if (intent) parts.push(intent.prompt);
  if (practice) parts.push(practice.prompt);
  if (juris) parts.push(juris.prompt);
  return parts.join("\n\n---\n\n") + `

# Output format

Reply with a single JSON object on one line (no prose, no markdown fences):
{"primary": "<intent>", "practiceArea": "<area or null>", "jurisdiction": "<ISO or null>", "language": "<en|ar|fr>", "confidence": <0.0-1.0>}

If unsure, set confidence < 0.6 and primary to "chitchat".`;
}

let _cachedSystem: string | null = null;
function systemPrompt(): string {
  if (_cachedSystem) return _cachedSystem;
  _cachedSystem = buildSystemPrompt();
  return _cachedSystem;
}

/**
 * Classify a user message. Returns undefined on failure (caller falls back).
 * Timeout: 3 seconds — if Gemini is slow, we'd rather miss than block chat latency.
 */
export async function classifyWithLLM(
  message: string,
  apiKey?: string,
): Promise<LLMClassification | undefined> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return undefined;

  try {
    const ai = new GoogleGenAI({ apiKey: key });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user" as const,
          parts: [{ text: `Classify this user message:\n\n"""${message.slice(0, 1500)}"""` }],
        },
      ],
      config: {
        systemInstruction: systemPrompt(),
        temperature: 0,
        responseMimeType: "application/json",
        maxOutputTokens: 200,
      },
    });
    clearTimeout(timeout);

    const text = (result as { text?: string }).text ?? "";
    if (!text) return undefined;

    // Strip any code fences just in case
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const primary = (parsed.primary as LLMClassification["primary"]) ?? "chitchat";
    return {
      primary,
      practiceArea: (parsed.practiceArea as string) || undefined,
      jurisdiction: (parsed.jurisdiction as string) || undefined,
      language: (parsed.language as LLMClassification["language"]) || undefined,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (e) {
    // Quiet failure — caller continues with keyword decision.
    console.warn("[skills/llm-classifier] failed:", (e as Error).message);
    return undefined;
  }
}
