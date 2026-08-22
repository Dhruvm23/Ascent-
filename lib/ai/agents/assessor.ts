import { callLLM, extractJson } from "../client";
import { quizPrompt, gradingPrompt } from "./prompts";
import { quizItemsSchema, gradingSchema, type QuizItemsOutput, type GradingOutput } from "../schemas";
import type { PresentationMode } from "@/lib/constants";

/**
 * Assessor Agent: generates calibrated quiz items and grades free-text
 * "explain it back" answers, detecting misconceptions specifically.
 */

export async function generateQuiz(args: {
  conceptName: string;
  conceptDescription: string;
  mode: PresentationMode;
  count?: number;
  userId?: string | null;
}): Promise<QuizItemsOutput> {
  const count = args.count ?? 2;
  const { system, user } = quizPrompt({
    conceptName: args.conceptName,
    conceptDescription: args.conceptDescription,
    mode: args.mode,
    count,
  });
  const res = await callLLM({
    agent: "assessor",
    task: "assessment",
    system,
    user,
    json: true,
    userId: args.userId,
    // A model returning syntactically-valid but wrong-shaped JSON should be
    // treated as a failure of THAT model, not a failure of the whole call —
    // this makes the client retry the next model in the chain.
    validate: (text) => quizItemsSchema.parse(JSON.parse(extractJson(text))),
  });
  return quizItemsSchema.parse(JSON.parse(extractJson(res.text)));
}

export async function gradeExplanation(args: {
  conceptName: string;
  conceptDescription: string;
  learnerText: string;
  mode: PresentationMode;
  userId?: string | null;
}): Promise<GradingOutput> {
  const { system, user } = gradingPrompt({
    conceptName: args.conceptName,
    conceptDescription: args.conceptDescription,
    learnerText: args.learnerText,
    mode: args.mode,
  });
  const res = await callLLM({
    agent: "assessor",
    task: "grading",
    system,
    user,
    json: true,
    userId: args.userId,
    noCache: true, // every learner answer is unique
    validate: (text) => gradingSchema.parse(JSON.parse(extractJson(text))),
  });
  return gradingSchema.parse(JSON.parse(extractJson(res.text)));
}
