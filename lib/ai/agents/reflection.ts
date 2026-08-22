import { callLLM } from "../client";
import { reflectionPrompt } from "./prompts";
import type { PresentationMode } from "@/lib/constants";

/**
 * Reflection Agent: a short, human-readable progress note. The summary data is
 * built server-side from our own records (trusted), so no data-block wrapping
 * is needed here.
 */
export async function summarizeProgress(args: {
  courseTitle: string;
  mode: PresentationMode;
  summaryData: string;
  userId?: string | null;
}): Promise<string> {
  const { system, user } = reflectionPrompt({
    courseTitle: args.courseTitle,
    mode: args.mode,
    summaryData: args.summaryData,
  });
  const res = await callLLM({
    agent: "reflection",
    task: "reflection",
    system,
    user,
    userId: args.userId,
  });
  return res.text.trim();
}
