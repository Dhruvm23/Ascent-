import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { MODEL_CHAINS } from "../lib/ai/models.config";

/**
 * Verifies OpenRouter connectivity and tests every model currently configured
 * in lib/ai/models.config.ts with a real chat completion, checking it returns
 * valid, parseable JSON. Run this before demo day — the free (`:free`) roster
 * rotates, and this tells you exactly which configured models are still alive.
 *
 *   npm run verify:models
 */

async function listFreeModels(): Promise<Set<string>> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`GET /models failed: HTTP ${res.status}`);
  const data = (await res.json()) as { data: { id: string }[] };
  return new Set(data.data.filter((m) => m.id.endsWith(":free")).map((m) => m.id));
}

async function testModel(model: string): Promise<{ ok: boolean; ms: number; note: string }> {
  const key = process.env.OPENROUTER_API_KEY ?? "";
  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Reply with strict JSON only, no prose, no markdown fences." },
          { role: "user", content: 'Return exactly this JSON: {"ok": true, "animal": "cat"}' },
        ],
        max_tokens: 100,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const ms = Date.now() - start;
    if (!res.ok) return { ok: false, ms, note: `HTTP ${res.status}` };
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = (data.choices?.[0]?.message?.content ?? "").trim();
    try {
      JSON.parse(content);
      return { ok: true, ms, note: content.slice(0, 60) };
    } catch {
      return { ok: false, ms, note: `non-JSON output: ${content.slice(0, 60)}` };
    }
  } catch (err) {
    return { ok: false, ms: Date.now() - start, note: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const key = process.env.OPENROUTER_API_KEY ?? "";
  if (!key) {
    console.log("No OPENROUTER_API_KEY set — nothing to verify (app will use cached/static fallbacks).");
    return;
  }

  const free = await listFreeModels();
  console.log(`OpenRouter currently lists ${free.size} ":free" models.\n`);

  const configured = new Set(Object.values(MODEL_CHAINS).flat());
  console.log(`Testing ${configured.size} model(s) currently configured in lib/ai/models.config.ts:\n`);

  let anyDead = false;
  for (const model of configured) {
    const stillListedFree = free.has(model);
    const result = await testModel(model);
    const flag = result.ok ? "✓" : "✗";
    if (!result.ok) anyDead = true;
    console.log(
      `${flag} ${model} — ${result.ms}ms — ${stillListedFree ? "still :free" : "NO LONGER FREE-LISTED"} — ${result.note}`,
    );
  }

  console.log(
    anyDead
      ? "\nSome configured models are dead or misbehaving — the fallback chain will route around them, but consider updating lib/ai/models.config.ts."
      : "\nAll configured models are alive and returning valid JSON.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
