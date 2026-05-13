import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  aliasProvider,
  type Provider,
  listKeys,
  addKey,
  setDefault,
  deleteKey,
  providerHasKey,
} from "../lib/userApiKeysExtended";

export const apiKeysRouter = Router();

apiKeysRouter.use(requireAuth);

// Catalog uses UI-friendly aliases (`anthropic` / `google`) — the route
// translates them to canonical DB ids (`claude` / `gemini`) before storing.
const PROVIDERS: { code: string; name: string; description: string; signupUrl: string }[] = [
  { code: "anthropic", name: "Anthropic (Claude)", description: "Claude Opus / Sonnet / Haiku — best for reasoning, drafting", signupUrl: "https://console.anthropic.com/" },
  { code: "openai", name: "OpenAI", description: "GPT-4o / o1 / o3 — broad capability, multimodal", signupUrl: "https://platform.openai.com/" },
  { code: "google", name: "Google (Gemini)", description: "Gemini 2.5 Flash / Pro — fast intent classification + cheap reasoning", signupUrl: "https://aistudio.google.com/" },
  { code: "voyage", name: "Voyage AI", description: "Embeddings — legal-domain retrieval (voyage-2-large)", signupUrl: "https://voyageai.com/" },
  { code: "cohere", name: "Cohere", description: "Multilingual embeddings + reranker for retrieval (embed-multilingual-v3.0 / rerank-multilingual-v3.0)", signupUrl: "https://dashboard.cohere.com/" },
  { code: "groq", name: "Groq", description: "Llama / Mixtral at <1s latency", signupUrl: "https://console.groq.com/" },
  { code: "deepseek", name: "DeepSeek", description: "Open-weights reasoning model with strong benchmarks", signupUrl: "https://platform.deepseek.com/" },
  { code: "mistral", name: "Mistral AI", description: "Mistral Large / Codestral — European data residency", signupUrl: "https://console.mistral.ai/" },
  { code: "openrouter", name: "OpenRouter", description: "Single key, many models — fallback chains", signupUrl: "https://openrouter.ai/" },
  { code: "cerebras", name: "Cerebras", description: "Fast Llama-3 inference", signupUrl: "https://cerebras.ai/" },
  { code: "perplexity", name: "Perplexity", description: "Web-search-grounded models", signupUrl: "https://perplexity.ai/" },
  { code: "tavily", name: "Tavily", description: "Search + retrieval API for RAG", signupUrl: "https://tavily.com/" },
  { code: "firecrawl", name: "Firecrawl", description: "Web scraping + crawling to LLM-ready markdown", signupUrl: "https://firecrawl.dev/" },
  { code: "huggingface", name: "Hugging Face", description: "Open-source model hub + Inference API", signupUrl: "https://huggingface.co/" },
];

// Inverse alias map — translate canonical DB ids back to the UI codes the
// frontend already speaks. Keeping this here means the route is the single
// translation seam; the store doesn't have to know about UI naming.
function uiAlias(canonical: Provider): string {
  if (canonical === "claude") return "anthropic";
  if (canonical === "gemini") return "google";
  return canonical;
}

apiKeysRouter.get("/providers", async (_req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const enriched = await Promise.all(
    PROVIDERS.map(async (p) => {
      const canonical = aliasProvider(p.code);
      const hasKey = canonical ? await providerHasKey(userId, canonical) : false;
      return { ...p, hasKey };
    }),
  );
  res.json({ providers: enriched });
});

apiKeysRouter.get("/", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { provider } = req.query as { provider?: string };
  let filter: Provider | undefined;
  if (provider) {
    const canonical = aliasProvider(provider);
    if (!canonical) {
      res.status(400).json({ error: `unsupported provider: ${provider}` });
      return;
    }
    filter = canonical;
  }
  const keys = await listKeys(userId, filter);
  res.json({
    keys: keys.map((k) => ({ ...k, provider: uiAlias(k.provider) })),
  });
});

apiKeysRouter.post("/", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { provider, key, label, isDefault } = req.body ?? {};
  if (!provider || !key) {
    res.status(400).json({ error: "provider and key required" });
    return;
  }
  const canonical = aliasProvider(provider);
  if (!canonical) {
    res.status(400).json({ error: `unsupported provider: ${provider}` });
    return;
  }
  try {
    const created = await addKey(userId, canonical, key, label, isDefault);
    res.status(201).json({ ...created, provider: uiAlias(created.provider) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to add key";
    res.status(500).json({ error: msg });
  }
});

apiKeysRouter.post("/:id/default", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const updated = await setDefault(req.params.id, userId);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...updated, provider: uiAlias(updated.provider) });
});

apiKeysRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const ok = await deleteKey(req.params.id, userId);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});
