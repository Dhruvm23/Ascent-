import { prisma } from "@/lib/db";
import { ensureCourse, loadCourseGraph } from "@/lib/courses";
import { resolveCurriculum, type CurriculumSource } from "@/lib/resolve-curriculum";
import { paramsForDifficulty } from "@/lib/engine/bkt";
import { initialSm2 } from "@/lib/engine/sm2";
import type { ConceptNode, MasteryRecord } from "@/lib/engine/types";
import type { PresentationMode } from "@/lib/constants";

/**
 * Enrol a learner in a subject: resolve + persist the course, save their
 * interests/mode, create the enrolment, and seed one MasteryState per concept
 * with a difficulty-informed prior. This is where the Cognitive Fingerprint is
 * born (the diagnostic then refines it).
 */
export async function enrollUser(args: {
  userId: string;
  subject: string;
  goalText?: string;
  targetWeeks: number;
  interests: string[];
  mode: PresentationMode;
}): Promise<{ enrollmentId: string; courseId: string; source: CurriculumSource }> {
  const resolved = await resolveCurriculum(args.subject, args.goalText);
  const { id: courseId } = await ensureCourse({
    subject: args.subject,
    curriculum: resolved.curriculum,
    isCached: resolved.source === "cache" || resolved.source === "curated-fallback",
    createdById: args.userId,
  });

  await prisma.user.update({
    where: { id: args.userId },
    data: { interests: args.interests, presentationMode: args.mode },
  });

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: args.userId, courseId } },
    create: {
      userId: args.userId,
      courseId,
      goalText: args.goalText,
      goalConceptIds: resolved.goalConceptIds,
      targetWeeks: args.targetWeeks,
    },
    update: {
      goalText: args.goalText,
      goalConceptIds: resolved.goalConceptIds,
      targetWeeks: args.targetWeeks,
    },
  });

  // Seed mastery states (skip any that already exist for idempotency).
  const concepts = await prisma.concept.findMany({ where: { courseId } });
  const existing = await prisma.masteryState.findMany({
    where: { enrollmentId: enrollment.id },
    select: { conceptId: true },
  });
  const have = new Set(existing.map((e) => e.conceptId));

  for (const c of concepts) {
    if (have.has(c.id)) continue;
    const prior = paramsForDifficulty(c.difficultyTier).pInit;
    const sm2 = initialSm2();
    await prisma.masteryState.create({
      data: {
        enrollmentId: enrollment.id,
        conceptId: c.id,
        pKnown: prior,
        easeFactor: sm2.easeFactor,
        intervalDays: sm2.intervalDays,
        repetitions: sm2.repetitions,
        dueAt: new Date(sm2.dueAt),
        lastReviewedAt: new Date(sm2.lastReviewedAt),
      },
    });
  }

  return { enrollmentId: enrollment.id, courseId, source: resolved.source };
}

export interface EnrollmentState {
  enrollment: {
    id: string;
    courseId: string;
    goalText: string | null;
    goalConceptIds: string[];
    targetWeeks: number;
    diagnosticDone: boolean;
  };
  course: { id: string; title: string; subject: string; slug: string; summary: string | null };
  nodes: ConceptNode[];
  masteryMap: Map<string, MasteryRecord>;
  /** external id -> concept db id (for writes) */
  conceptDbIds: Map<string, string>;
  interests: string[];
  mode: PresentationMode;
}

/** Load everything the engine + UI need for a user's active (most recent) enrolment. */
export async function loadActiveEnrollment(userId: string): Promise<EnrollmentState | null> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: { course: true, user: true },
  });
  if (!enrollment) return null;
  return buildEnrollmentState(enrollment.id);
}

export async function buildEnrollmentState(enrollmentId: string): Promise<EnrollmentState | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: true, user: true },
  });
  if (!enrollment) return null;

  const nodes = await loadCourseGraph(enrollment.courseId);
  const concepts = await prisma.concept.findMany({ where: { courseId: enrollment.courseId } });
  const conceptDbIds = new Map(concepts.map((c) => [c.externalId, c.id]));
  const dbIdToExternal = new Map(concepts.map((c) => [c.id, c.externalId]));

  const states = await prisma.masteryState.findMany({ where: { enrollmentId } });
  const masteryMap = new Map<string, MasteryRecord>();
  for (const s of states) {
    const externalId = dbIdToExternal.get(s.conceptId);
    if (!externalId) continue;
    masteryMap.set(externalId, {
      conceptId: externalId,
      pKnown: s.pKnown,
      misconception: s.misconception,
      sm2: {
        easeFactor: s.easeFactor,
        intervalDays: s.intervalDays,
        repetitions: s.repetitions,
        dueAt: s.dueAt.toISOString(),
        lastReviewedAt: s.lastReviewedAt.toISOString(),
      },
    });
  }

  return {
    enrollment: {
      id: enrollment.id,
      courseId: enrollment.courseId,
      goalText: enrollment.goalText,
      goalConceptIds: enrollment.goalConceptIds,
      targetWeeks: enrollment.targetWeeks,
      diagnosticDone: enrollment.diagnosticDone,
    },
    course: {
      id: enrollment.course.id,
      title: enrollment.course.title,
      subject: enrollment.course.subject,
      slug: enrollment.course.slug,
      summary: enrollment.course.summary,
    },
    nodes,
    masteryMap,
    conceptDbIds,
    interests: enrollment.user.interests,
    mode: enrollment.user.presentationMode as PresentationMode,
  };
}
