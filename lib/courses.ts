import { prisma } from "@/lib/db";
import type { CurriculumOutput } from "@/lib/ai/schemas";
import { curriculumToNodes } from "@/lib/ai/agents/curriculum-architect";
import { computeElevation } from "@/lib/engine/graph";
import type { ConceptNode, DifficultyTier } from "@/lib/engine/types";
import { slugifySubject } from "@/lib/utils";

/**
 * Turn a validated curriculum into shared persistent records: one Course per
 * subject slug (reused across learners), its Concepts + prerequisite edges, and
 * its diagnostic QuizItems. Also mirrors the graph into CurriculumCache so
 * repeat learners (and judges) get an instant course.
 *
 * Courses are shared; per-learner state lives entirely in Enrollment/MasteryState.
 */
export async function ensureCourse(args: {
  subject: string;
  curriculum: CurriculumOutput;
  isCached: boolean;
  createdById?: string | null;
}): Promise<{ id: string; slug: string; created: boolean }> {
  const slug = slugifySubject(args.subject);

  await prisma.curriculumCache.upsert({
    where: { subjectKey: slug },
    create: { subjectKey: slug, subject: args.subject, graph: args.curriculum as object },
    update: { subject: args.subject, graph: args.curriculum as object },
  });

  const existing = await prisma.course.findFirst({ where: { slug } });
  if (existing) return { id: existing.id, slug, created: false };

  const nodes = curriculumToNodes(args.curriculum);
  const elevation = computeElevation(nodes);

  const course = await prisma.course.create({
    data: {
      slug,
      title: args.curriculum.title,
      subject: args.subject,
      summary: args.curriculum.summary,
      isCached: args.isCached,
      createdById: args.createdById ?? null,
    },
  });

  // Pass 1: create concepts, remembering externalId -> db id.
  const idMap = new Map<string, string>();
  for (const c of args.curriculum.concepts) {
    const created = await prisma.concept.create({
      data: {
        courseId: course.id,
        externalId: c.id,
        name: c.name,
        description: c.description,
        difficultyTier: c.difficultyTier,
        elevation: elevation.get(c.id) ?? 0,
      },
    });
    idMap.set(c.id, created.id);
  }

  // Pass 2: connect prerequisite edges now that all concepts exist.
  for (const c of args.curriculum.concepts) {
    if (!c.prerequisiteIds.length) continue;
    const prereqDbIds = c.prerequisiteIds
      .map((p) => idMap.get(p))
      .filter((x): x is string => Boolean(x))
      .map((id) => ({ id }));
    if (prereqDbIds.length) {
      await prisma.concept.update({
        where: { id: idMap.get(c.id)! },
        data: { prerequisites: { connect: prereqDbIds } },
      });
    }
  }

  // Diagnostic items.
  for (const d of args.curriculum.diagnostics) {
    const conceptDbId = idMap.get(d.conceptId);
    if (!conceptDbId) continue;
    await prisma.quizItem.create({
      data: {
        courseId: course.id,
        conceptId: conceptDbId,
        kind: "diagnostic",
        stem: d.stem,
        choices: d.choices,
        answer: d.answerId,
        difficulty: d.difficulty,
      },
    });
  }

  return { id: course.id, slug, created: true };
}

/** Load a course's concept graph as engine-ready ConceptNode[] (external ids). */
export async function loadCourseGraph(courseId: string): Promise<ConceptNode[]> {
  const concepts = await prisma.concept.findMany({
    where: { courseId },
    include: { prerequisites: { select: { externalId: true } } },
  });
  return concepts.map((c) => ({
    id: c.externalId,
    name: c.name,
    description: c.description,
    prerequisiteIds: c.prerequisites.map((p) => p.externalId),
    difficultyTier: c.difficultyTier as DifficultyTier,
  }));
}

export async function getCachedCurriculum(subject: string): Promise<CurriculumOutput | null> {
  const slug = slugifySubject(subject);
  const row = await prisma.curriculumCache.findUnique({ where: { subjectKey: slug } });
  return row ? (row.graph as unknown as CurriculumOutput) : null;
}
