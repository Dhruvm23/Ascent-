import { MODEL_CHAINS, TASK_DEFAULTS, OPENROUTER_URL } from "./models.config";
import { callLLM, isAiConfigured, openRouterApiKey } from "./client";
import { logAgentCall } from "./log";
import { AiNotConfiguredError, type LlmCallOptions } from "./types";

/**
 * Streaming chat. Streams token deltas from the first model in the chain for a
 * responsive UI; if streaming fails, it transparently falls back to the
 * non-streaming client (which walks the whole fallback chain) and emits the
 * full text at once. The learner sees words appear either way.
 */
export async function* streamChat(opts: LlmCallOptions): AsyncGenerator<string, void, unknown> {
  const started = Date.now();
  const chain = MODEL_CHAINS[opts.task];
  const defaults = TASK_DEFAULTS[opts.task];
  const modelRequested = chain[0];

  if (!isAiConfigured()) {
    void logAgentCall(opts, {
      text: "",
      modelServed: null,
      modelRequested,
      attempts: 0,
      cached: false,
      status: "degraded",
      latencyMs: Date.now() - started,
    });
    throw new AiNotConfiguredError();
  }

  const model = chain[0];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? defaults.timeoutMs);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env["OPENROUTER_APP_URL"]?.trim() ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
        "X-Title": process.env["OPENROUTER_APP_NAME"]?.trim() || "Ascent",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: opts.temperature ?? defaults.temperature,
        max_tokens: opts.maxTokens ?? defaults.maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} (stream) from ${model}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            yield delta;
          }
        } catch {
          /* keepalive / partial line — ignore */
        }
      }
    }

    clearTimeout(timeout);
    if (!full.trim()) throw new Error("Empty stream");
    void logAgentCall(opts, {
      text: full,
      modelServed: model,
      modelRequested,
      attempts: 1,
      cached: false,
      status: "ok",
      latencyMs: Date.now() - started,
    });
    return;
  } catch {
    clearTimeout(timeout);
    // Streaming failed — fall back to the resilient non-streaming chain.
    const result = await callLLM(opts); // logs its own AgentLog entry
    if (result.text) yield result.text;
    return;
  }
}
