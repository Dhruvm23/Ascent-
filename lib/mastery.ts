import { prisma } from "@/lib/db";
import { bktUpdate, paramsForDifficulty, MASTERY_THRESHOLD } from "@/lib/engine/bkt";
import { sm2Update, qualityFromAnswer, initialSm2 } from "@/lib/engine/sm2";
import { classifyResponse, type RadarResult } from "@/lib/engine/confusion-radar";

/**
 * Apply one graded response to a concept's mastery state — the single place
 * the Cognitive Fingerprint changes. It runs BKT, the Confusion Radar, and the
 * SM-2 scheduler together, records the raw interaction for the audit trail, and
 * returns the new state so the UI can light up the node.
 */
export async function applyAnswer(args: {
  enrollmentId: string;
  conceptExternalId: string;
  correct: boolean;
  confidence: number;
  latencyMs: number;
  answerChanges: number;
  attempts: number;
  type: "quiz" | "feynman" | "review" | "diagnostic";
}): Promise<{ pKnown: number; radar: RadarResult; misconception: boolean; mastered: boolean }> {
  const concept = await prisma.concept.findFirst({
    where: { externalId: args.conceptExternalId, course: { enrollments: { some: { id: args.enrollmentId } } } },
  });
  if (!concept) throw new Error("Concept not found for this enrolment.");

  const state =
    (await prisma.masteryState.findUnique({
      where: { enrollmentId_conceptId: { enrollmentId: args.enrollmentId, conceptId: concept.id } },
    })) ??
    (await prisma.masteryState.create({
      data: {
        enrollmentId: args.enrollmentId,
        conceptId: concept.id,
        pKnown: paramsForDifficulty(concept.difficultyTier).pInit,
        ...sm2ToColumns(initialSm2()),
      },
    }));

  const params = paramsForDifficulty(concept.difficultyTier);
  const newPKnown = bktUpdate(state.pKnown, args.correct, params);

  const radar = classifyResponse({
    latencyMs: args.latencyMs,
    answerChanges: args.answerChanges,
    attempts: args.attempts,
    confidence: args.confidence,
    correct: args.correct,
  });

  // Advance SM-2 (treat every graded attempt as a review opportunity).
  const quality = qualityFromAnswer(args.correct, args.confidence, args.latencyMs);
  const nextSm2 = sm2Update(
    {
      easeFactor: state.easeFactor,
      intervalDays: state.intervalDays,
      repetitions: state.repetitions,
      dueAt: state.dueAt.toISOString(),
      lastReviewedAt: state.lastReviewedAt.toISOString(),
    },
    quality,
  );

  // A misconception latches on when detected, and clears once the learner is
  // both correct and past the mastery threshold.
  const misconception = radar.label === "misconception"
    ? true
    : args.correct && newPKnown >= MASTERY_THRESHOLD
      ? false
      : state.misconception;

  await prisma.masteryState.update({
    where: { enrollmentId_conceptId: { enrollmentId: args.enrollmentId, conceptId: concept.id } },
    data: {
      pKnown: newPKnown,
      misconception,
      ...sm2ToColumns(nextSm2),
    },
  });

  await prisma.interaction.create({
    data: {
      enrollmentId: args.enrollmentId,
      conceptId: args.conceptExternalId,
      type: args.type,
      correct: args.correct,
      latencyMs: args.latencyMs,
      confidence: args.confidence,
      answerChanges: args.answerChanges,
      attempts: args.attempts,
    },
  });

  return {
    pKnown: newPKnown,
    radar,
    misconception,
    mastered: newPKnown >= MASTERY_THRESHOLD,
  };
}

function sm2ToColumns(s: ReturnType<typeof initialSm2>) {
  return {
    easeFactor: s.easeFactor,
    intervalDays: s.intervalDays,
    repetitions: s.repetitions,
    dueAt: new Date(s.dueAt),
    lastReviewedAt: new Date(s.lastReviewedAt),
  };
}
