import { prisma } from "@/lib/db";
import type { LlmCallOptions, LlmCallResult } from "./types";

/**
 * Persist one agent call for the Efficiency view (/dev/logs). Logging must
 * never break a request, so all failures here are swallowed. When usage tokens
 * aren't returned by the provider we estimate from character count (~4 ch/tok).
 */
export async function logAgentCall(
  opts: LlmCallOptions,
  result: LlmCallResult,
): Promise<void> {
  try {
    const promptTokens =
      result.promptTokens ?? estimateTokens(opts.system.length + opts.user.length);
    const completionTokens = result.completionTokens ?? estimateTokens(result.text.length);

    await prisma.agentLog.create({
      data: {
        userId: opts.userId ?? null,
        agent: opts.agent,
        taskType: opts.task,
        modelRequested: result.modelRequested,
        modelServed: result.modelServed,
        attempts: result.attempts,
        latencyMs: result.latencyMs,
        promptTokens,
        completionTokens,
        cached: result.cached,
        status: result.status,
      },
    });
  } catch {
    // Never let logging failures surface to the learner.
  }
}

function estimateTokens(chars: number): number {
  return Math.max(0, Math.round(chars / 4));
}
