import {
  MODEL_CHAINS,
  TASK_DEFAULTS,
  OPENROUTER_URL,
  MAX_ATTEMPTS,
} from "./models.config";
import { cacheKey, getCached, setCached } from "./cache";
import {
  AiNotConfiguredError,
  AllModelsFailedError,
  type CallStatus,
  type LlmCallOptions,
  type LlmCallResult,
} from "./types";
import { logAgentCall } from "./log";

/**
 * The single server-side gateway to OpenRouter. Every agent goes through here.
 *
 * Responsibilities:
 *   - keep the API key server-side (never shipped to the client)
 *   - walk a per-task model fallback chain on 429 / error / timeout / bad JSON
 *   - apply a hard per-attempt timeout and a short exponential backoff
 *   - cache identical prompts to spare the rate-limited free tier
 *   - log every call (model requested vs served, attempts, latency, tokens,
 *     cache hit, status) for the /dev/logs efficiency view
 */

/** Runtime lookup (bracket access) so Next/Webpack cannot freeze a build-time empty key. */
function env(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

export function openRouterApiKey(): string {
  return env("OPENROUTER_API_KEY");
}

export function isAiConfigured(): boolean {
  return env("ASCENT_OFFLINE_FALLBACK") !== "1" && openRouterApiKey().length > 8;
}

export async function callLLM(opts: LlmCallOptions): Promise<LlmCallResult> {
  const started = Date.now();
  const defaults = TASK_DEFAULTS[opts.task];
  const chain = MODEL_CHAINS[opts.task];
  const modelRequested = chain[0];
  const key = opts.cacheKey ?? cacheKey([opts.task, opts.system, opts.user]);

  // 1. Cache hit — cheapest path.
  if (!opts.noCache) {
    const hit = getCached(key);
    if (hit !== null) {
      const result: LlmCallResult = {
        text: hit,
        modelServed: "cache",
        modelRequested,
        attempts: 0,
        cached: true,
        status: "cached",
        latencyMs: Date.now() - started,
      };
      void logAgentCall(opts, result);
      return result;
    }
  }

  // 2. Offline / unconfigured — fail fast so the caller can use static content.
  if (!isAiConfigured()) {
    const result: LlmCallResult = {
      text: "",
      modelServed: null,
      modelRequested,
      attempts: 0,
      cached: false,
      status: "degraded",
      latencyMs: Date.now() - started,
    };
    void logAgentCall(opts, result);
    throw new AiNotConfiguredError();
  }

  // 3. Walk the fallback chain.
  let attempts = 0;
  let lastError = "unknown error";
  for (let i = 0; i < chain.length && attempts < MAX_ATTEMPTS; i++) {
    const model = chain[i];
    attempts++;
    try {
      const { text, promptTokens, completionTokens } = await callOnce(model, opts, defaults);
      if (opts.json) JSON.parse(extractJson(text)); // validate parseable JSON
      opts.validate?.(text); // validate shape (e.g. Zod) — throws => try next model

      if (!opts.noCache) setCached(key, text);
      const status: CallStatus = i === 0 ? "ok" : "fallback";
      const result: LlmCallResult = {
        text,
        modelServed: model,
        modelRequested,
        attempts,
        cached: false,
        status,
        latencyMs: Date.now() - started,
        promptTokens,
        completionTokens,
      };
      void logAgentCall(opts, result);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Short exponential backoff before trying the next model.
      await sleep(Math.min(1500, 250 * 2 ** i));
    }
  }

  const result: LlmCallResult = {
    text: "",
    modelServed: null,
    modelRequested,
    attempts,
    cached: false,
    status: "error",
    latencyMs: Date.now() - started,
  };
  void logAgentCall(opts, result);
  throw new AllModelsFailedError(
    `All ${attempts} model attempt(s) failed. Last error: ${lastError}`,
    attempts,
  );
}

async function callOnce(
  model: string,
  opts: LlmCallOptions,
  defaults: { temperature: number; maxTokens: number; timeoutMs: number },
): Promise<{ text: string; promptTokens?: number; completionTokens?: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? defaults.timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          env("OPENROUTER_APP_URL") ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
        "X-Title": env("OPENROUTER_APP_NAME") || "Ascent",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: opts.temperature ?? defaults.temperature,
        max_tokens: opts.maxTokens ?? defaults.maxTokens,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} from ${model}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error(`Empty completion from ${model}`);
    return {
      text,
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Pull a JSON object/array out of a model response that may wrap it in prose or fences. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return candidate.trim();
  // Find the matching closing bracket for the first opening one.
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++;
    else if (candidate[i] === close) {
      depth--;
      if (depth === 0) return candidate.slice(start, i + 1).trim();
    }
  }
  return candidate.slice(start).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
