import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { addKey, deleteKey, listKeys, setDefault, providerHasKey, Provider } from "../apiKeys/_store";

export const apiKeysRouter = Router();

apiKeysRouter.use(requireAuth);

const PROVIDERS: { code: Provider; name: string; description: string; signupUrl: string }[] = [
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

apiKeysRouter.get("/providers", (_req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const enriched = PROVIDERS.map(p => ({
    ...p,
    hasKey: providerHasKey(userId, p.code),
  }));
  res.json({ providers: enriched });
});

apiKeysRouter.get("/", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { provider } = req.query as { provider?: Provider };
  res.json({ keys: listKeys(userId, provider) });
});

apiKeysRouter.post("/", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { provider, key, label, isDefault } = req.body ?? {};
  if (!provider || !key) {
    res.status(400).json({ error: "provider and key required" });
    return;
  }
  if (!PROVIDERS.find(p => p.code === provider)) {
    res.status(400).json({ error: `unsupported provider: ${provider}` });
    return;
  }
  const created = addKey(userId, provider, key, label, isDefault);
  res.status(201).json(created);
});

apiKeysRouter.post("/:id/default", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const updated = setDefault(req.params.id, userId);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

apiKeysRouter.delete("/:id", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const ok = deleteKey(req.params.id, userId);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});
