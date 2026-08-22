import type { PresentationMode } from "@/lib/constants";
import { curriculumSchema, type CurriculumOutput, type GradingOutput } from "./schemas";
import { clamp, slugifySubject } from "@/lib/utils";

/**
 * Static, deterministic fallbacks used when every model in the chain fails or
 * the app runs in offline mode. Subject-agnostic — built purely from the
 * concept's own name/description — so the learner always sees real content,
 * never a broken screen, during judging.
 */

const OPENERS: Record<PresentationMode, string> = {
  explorer: "Let's picture this together.",
  focus: "Here's the core idea.",
  mastery: "Core mechanism, briefly.",
};

export function staticExplanation(args: {
  conceptName: string;
  conceptDescription: string;
  interests: string[];
  mode: PresentationMode;
}): string {
  const interest = args.interests[0];
  const analogy = interest
    ? `Think about ${interest} for a second — the way its parts fit together is a useful lens here. `
    : "";
  return [
    `${OPENERS[args.mode]} ${analogy}`,
    `${args.conceptName}: ${args.conceptDescription}`,
    `The key is to hold onto that one idea before adding detail. Once "${args.conceptName}" feels natural, the concepts that build on it get much easier.`,
    `Why it matters: it's a stepping stone on your route — later ideas lean on it directly.`,
  ].join("\n\n");
}

/** Heuristic grading by keyword overlap with the reference description. */
export function staticGrading(args: {
  conceptDescription: string;
  learnerText: string;
}): GradingOutput {
  const keywords = significantWords(args.conceptDescription);
  const answerWords = new Set(significantWords(args.learnerText));
  const hit = keywords.filter((k) => answerWords.has(k));
  const coverage = keywords.length ? hit.length / keywords.length : 0;
  const correctness = clamp(coverage + (args.learnerText.length > 40 ? 0.1 : 0), 0, 1);
  const completeness = clamp(coverage, 0, 1);
  const missing = keywords.filter((k) => !answerWords.has(k)).slice(0, 3);

  return {
    correctness: round2(correctness),
    completeness: round2(completeness),
    misconception: false,
    misconceptionNote: "",
    feedback:
      missing.length && coverage < 0.8
        ? `Good start. Try to also touch on: ${missing.join(", ")}.`
        : `Solid — you covered the key ideas in your own words.`,
  };
}

export function staticReflection(args: {
  masteredCount: number;
  totalCount: number;
  nextConceptName?: string;
}): string {
  const pct = args.totalCount ? Math.round((args.masteredCount / args.totalCount) * 100) : 0;
  const next = args.nextConceptName
    ? ` Next up, focus on ${args.nextConceptName} — it's the next foothold on your route.`
    : " You've reached the summit of this route — consider setting a new goal.";
  return `You've mastered ${args.masteredCount} of ${args.totalCount} concepts (${pct}%).${next}`;
}

/**
 * Last-resort course when every live model fails (429, timeout, bad JSON).
 * Subject-agnostic ladder so enroll always succeeds; not a substitute for the Architect.
 */
export function staticCurriculum(subject: string, goal?: string): CurriculumOutput {
  const label = subject.trim().slice(0, 80) || "this subject";
  const slug = (slugifySubject(label) || "topic").slice(0, 24);
  const goalBit = goal?.trim()
    ? ` Aimed at: ${goal.trim().slice(0, 160)}.`
    : "";

  const steps: { id: string; name: string; description: string; prereq: string[]; tier: number }[] = [
    {
      id: `${slug}-foundations`,
      name: `Foundations of ${label}`,
      description: `The basic terms and building blocks you need before anything else in ${label}.`,
      prereq: [],
      tier: 1,
    },
    {
      id: `${slug}-core`,
      name: `Core idea of ${label}`,
      description: `The single mechanism or pattern that most of ${label} is organised around.${goalBit}`,
      prereq: [`${slug}-foundations`],
      tier: 2,
    },
    {
      id: `${slug}-practice`,
      name: `Working with ${label}`,
      description: `How to apply the core idea of ${label} in a small, concrete example.`,
      prereq: [`${slug}-core`],
      tier: 3,
    },
    {
      id: `${slug}-links`,
      name: `How ${label} connects`,
      description: `How the core idea of ${label} depends on the foundations and leads into later skill.`,
      prereq: [`${slug}-practice`],
      tier: 3,
    },
    {
      id: `${slug}-apply`,
      name: `Using ${label} in context`,
      description: `A realistic situation where you would use ${label} to make a decision or produce something.`,
      prereq: [`${slug}-links`],
      tier: 4,
    },
    {
      id: `${slug}-summit`,
      name: `Putting ${label} together`,
      description: `Combine the earlier waypoints into one coherent picture of ${label}.`,
      prereq: [`${slug}-apply`],
      tier: 5,
    },
  ];

  const concepts = steps.map((s) => ({
    id: s.id.slice(0, 60),
    name: s.name.slice(0, 120),
    description: s.description.slice(0, 600),
    prerequisiteIds: s.prereq,
    difficultyTier: s.tier,
  }));

  const diagnostics = concepts.slice(0, 4).map((c, i) => ({
    conceptId: c.id,
    stem: `Which statement best describes "${c.name}"?`,
    choices: [
      { id: "a", text: c.description.slice(0, 400) },
      { id: "b", text: `${c.name} is unrelated to ${label}.` },
      { id: "c", text: `${c.name} is only a memorisation trick, not a real idea.` },
    ],
    answerId: "a" as const,
    difficulty: ([-1, -0.3, 0.4, 1] as const)[i] ?? 0,
  }));

  return curriculumSchema.parse({
    title: label.slice(0, 120),
    summary: `A starter route through ${label} (offline fallback while live models are unavailable).${goalBit}`.slice(
      0,
      500,
    ),
    concepts,
    diagnostics,
  });
}

export function staticQuizItem(conceptName: string, conceptDescription: string) {
  return {
    stem: `Which statement best describes "${conceptName}"?`,
    choices: [
      { id: "a", text: conceptDescription },
      { id: "b", text: `${conceptName} has no relationship to the concepts before it.` },
      { id: "c", text: `${conceptName} only matters for memorisation, not understanding.` },
    ],
    answerId: "a",
    explanation: `"${conceptName}" is best summarised as: ${conceptDescription}`,
  };
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "is", "are", "in", "on", "for", "with",
  "that", "this", "it", "as", "by", "be", "from", "at", "into", "how", "what", "which",
  "when", "you", "your", "we", "they", "can", "will", "its", "if", "so",
]);

function significantWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
