import type { ChatTask } from "./models.config";

export type AgentName =
  | "curriculum-architect"
  | "diagnostic"
  | "tutor"
  | "assessor"
  | "path-planner"
  | "reflection";

export type CallStatus = "ok" | "fallback" | "cached" | "degraded" | "error";

export interface LlmCallOptions {
  agent: AgentName;
  task: ChatTask;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  json?: boolean;
  userId?: string | null;
  /** Explicit cache key; when omitted, the client hashes system+user. */
  cacheKey?: string;
  /** Skip the response cache (e.g. per-learner personalised generations). */
  noCache?: boolean;
  /**
   * Optional deep validator (e.g. a Zod `.parse` call) run against the raw
   * response text. Throwing here is treated the same as an HTTP error or bad
   * JSON: the client retries the NEXT model in the chain instead of handing
   * back a response that's valid JSON but the wrong shape.
   */
  validate?: (text: string) => void;
  /** Cap how many models to try (defaults to MAX_ATTEMPTS). */
  maxAttempts?: number;
}

export interface LlmCallResult {
  text: string;
  modelServed: string | null;
  modelRequested: string;
  attempts: number;
  cached: boolean;
  status: CallStatus;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
}

export class AllModelsFailedError extends Error {
  attempts: number;
  constructor(message: string, attempts: number) {
    super(message);
    this.name = "AllModelsFailedError";
    this.attempts = attempts;
  }
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("OpenRouter API key is not configured (running in offline mode).");
    this.name = "AiNotConfiguredError";
  }
}
