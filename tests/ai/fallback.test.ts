import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Logging writes to the DB; stub it so these are pure client tests.
vi.mock("@/lib/ai/log", () => ({ logAgentCall: vi.fn() }));

import { callLLM, isAiConfigured } from "@/lib/ai/client";
import { clearCache } from "@/lib/ai/cache";
import { AllModelsFailedError, AiNotConfiguredError } from "@/lib/ai/types";

function jsonResponse(content: string, status = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("callLLM fallback chain", () => {
  beforeEach(() => {
    clearCache();
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123456";
    delete process.env.ASCENT_OFFLINE_FALLBACK;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok from the first model when it succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse("hello")));
    const res = await callLLM({ agent: "tutor", task: "explanation", system: "s", user: "u1" });
    expect(res.status).toBe("ok");
    expect(res.attempts).toBe(1);
    expect(res.text).toBe("hello");
  });

  it("falls back to the next model on a 429 and reports status 'fallback'", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse("nope", 429))
      .mockResolvedValueOnce(jsonResponse("recovered"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await callLLM({ agent: "tutor", task: "explanation", system: "s", user: "u2" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe("fallback");
    expect(res.attempts).toBe(2);
    expect(res.text).toBe("recovered");
  });

  it("throws AllModelsFailedError when every model fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse("down", 500)));
    await expect(
      callLLM({ agent: "assessor", task: "assessment", system: "s", user: "u3" }),
    ).rejects.toBeInstanceOf(AllModelsFailedError);
  });

  it("serves a cached response on an identical prompt without calling fetch again", async () => {
    const fetchMock = vi.fn(async () => jsonResponse("cache-me"));
    vi.stubGlobal("fetch", fetchMock);

    const first = await callLLM({ agent: "tutor", task: "explanation", system: "sys", user: "same" });
    const second = await callLLM({ agent: "tutor", task: "explanation", system: "sys", user: "same" });

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.status).toBe("cached");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries past invalid JSON when json output is required", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse("not json at all"))
      .mockResolvedValueOnce(jsonResponse('{"valid": true}'));
    vi.stubGlobal("fetch", fetchMock);

    const res = await callLLM({ agent: "curriculum-architect", task: "curriculum", system: "s", user: "u4", json: true });
    expect(res.status).toBe("fallback");
    expect(JSON.parse(res.text)).toEqual({ valid: true });
  });

  it("retries the next model when a response is valid JSON but the wrong shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse('{"unexpected": "shape"}'))
      .mockResolvedValueOnce(jsonResponse('{"items": []}'));
    vi.stubGlobal("fetch", fetchMock);

    const res = await callLLM({
      agent: "assessor",
      task: "assessment",
      system: "s",
      user: "u5",
      json: true,
      validate: (text) => {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.items)) throw new Error("missing items array");
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe("fallback");
    expect(res.text).toBe('{"items": []}');
  });

  it("fails fast with AiNotConfiguredError in offline mode", async () => {
    process.env.ASCENT_OFFLINE_FALLBACK = "1";
    expect(isAiConfigured()).toBe(false);
    await expect(
      callLLM({ agent: "tutor", task: "explanation", system: "s", user: "offline" }),
    ).rejects.toBeInstanceOf(AiNotConfiguredError);
  });
});
