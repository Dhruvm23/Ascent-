/**
 * Model fallback chains, per task type.
 *
 * ⚠️  IMPORTANT — OpenRouter's free (`:free`) roster ROTATES, often weekly.
 * Models lose free-tier status without warning and are rate-limited
 * (commonly ~20 req/min + a daily cap). Do NOT trust this list blindly.
 *
 * BEFORE DEMO DAY: verify current free IDs at
 *   https://openrouter.ai/models?order=pricing-low-to-high&max_price=0
 * and reorder/replace below. Do not assume DeepSeek/Kimi/etc. are free — check.
 *
 * The client walks each chain top-to-bottom: on 429 / error / timeout / bad
 * JSON it retries the NEXT model. So even if the first two IDs are dead, the
 * app keeps working as long as one entry in the chain is live — and if the
 * whole chain fails, callers fall back to cached/static content.
 */

export type ChatTask =
  | "curriculum" // Curriculum Architect: build a whole graph. Needs strong reasoning.
  | "explanation" // Tutor: analogy-driven teaching. Benefits from a capable model.
  | "grading" // Assessor: grade free-text. Needs judgement + structure.
  | "assessment" // Assessor: generate quiz items. Fast/cheap is fine.
  | "diagnostic" // Diagnostic pretest items. Fast/cheap.
  | "reflection" // Reflection summaries. Small, cheap.
  | "planning"; // Path planner rationale. Small, cheap.

// Reasoning-tier chain (quality-first) and a fast/cheap chain.
//
// Last verified live 2026-08-22 by scripts/check-openrouter.ts (sends a real
// chat completion to each candidate and checks for valid JSON output). At that
// check, every model below responded with clean output; z-ai/glm-5.2 and the
// google/gemma-4 line were upstream-rate-limited (still kept as later fallback
// candidates since they're strong models that may recover). Models that
// returned empty or malformed content (nemotron-nano-9b-v2, nemotron-3.5-
// lightning, nemotron-3-ultra-550b-a55b, liquid/lfm-2.5-2.6b, poolside/laguna-
// xs-2.1, dots-studio/dots-3-note-preview) were deliberately excluded — re-run
// the check script before relying on this list again.
const REASONING_CHAIN = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "z-ai/glm-5.2:free",
  "google/gemma-4-31b-it:free",
  "poolside/laguna-s-2.1:free",
];

const FAST_CHAIN = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
  "poolside/laguna-s-2.1:free",
  "cohere/north-mini-code:free",
];

export const MODEL_CHAINS: Record<ChatTask, string[]> = {
  // Fast models first so a Vercel Hobby function (~60s) can retry instead of
  // dying on one 60s reasoning call.
  curriculum: FAST_CHAIN,
  explanation: REASONING_CHAIN,
  grading: REASONING_CHAIN,
  assessment: FAST_CHAIN,
  diagnostic: FAST_CHAIN,
  reflection: FAST_CHAIN,
  planning: FAST_CHAIN,
};

// Per-task generation defaults.
export const TASK_DEFAULTS: Record<
  ChatTask,
  { temperature: number; maxTokens: number; timeoutMs: number }
> = {
  curriculum: { temperature: 0.4, maxTokens: 2600, timeoutMs: 16_000 },
  explanation: { temperature: 0.7, maxTokens: 1100, timeoutMs: 45_000 },
  grading: { temperature: 0.2, maxTokens: 700, timeoutMs: 40_000 },
  assessment: { temperature: 0.5, maxTokens: 1200, timeoutMs: 40_000 },
  diagnostic: { temperature: 0.5, maxTokens: 1400, timeoutMs: 45_000 },
  reflection: { temperature: 0.6, maxTokens: 500, timeoutMs: 30_000 },
  planning: { temperature: 0.3, maxTokens: 400, timeoutMs: 30_000 },
};

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MAX_ATTEMPTS = 4; // cap retries across the chain
