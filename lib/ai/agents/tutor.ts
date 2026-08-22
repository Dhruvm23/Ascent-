import { streamChat } from "../stream";
import { callLLM } from "../client";
import { tutorPrompt } from "./prompts";
import type { PresentationMode } from "@/lib/constants";

/**
 * Tutor Agent (Analogy Engine). Generates an explanation of one concept using
 * the learner's interests as the analogy domain and their presentation mode as
 * the tone/pacing — so two learners on the same concept get genuinely
 * different explanations.
 */

export interface TutorArgs {
  conceptName: string;
  conceptDescription: string;
  interests: string[];
  mode: PresentationMode;
  pKnown: number;
  userId?: string | null;
}

/** Streaming explanation for responsive UI. */
export function streamExplanation(args: TutorArgs): AsyncGenerator<string, void, unknown> {
  const { system, user } = tutorPrompt(args);
  return streamChat({
    agent: "tutor",
    task: "explanation",
    system,
    user,
    userId: args.userId,
  });
}

/** Non-streaming explanation (used in tests / when streaming isn't needed). */
export async function generateExplanation(args: TutorArgs): Promise<string> {
  const { system, user } = tutorPrompt(args);
  const res = await callLLM({
    agent: "tutor",
    task: "explanation",
    system,
    user,
    userId: args.userId,
  });
  return res.text.trim();
}
