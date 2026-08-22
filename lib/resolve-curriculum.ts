import { getCachedCurriculum } from "@/lib/courses";
import { architectCurriculum } from "@/lib/ai/agents/curriculum-architect";
import { isAiConfigured } from "@/lib/ai/client";
import { staticCurriculum } from "@/lib/ai/fallback";
import { SEED_SUBJECTS } from "@/lib/seed-data/subjects";
import { slugifySubject } from "@/lib/utils";
import type { CurriculumOutput } from "@/lib/ai/schemas";

export type CurriculumSource = "cache" | "live" | "curated-fallback" | "static";

export interface ResolvedCurriculum {
  curriculum: CurriculumOutput;
  source: CurriculumSource;
  /** External concept ids that form the goal route ("summit"). */
  goalConceptIds: string[];
}

/**
 * Resolve a curriculum for any subject with a resilient strategy:
 *   1. cache          — instant, reliable (the pre-seeded subjects live here).
 *   2. live           — Curriculum Architect Agent generates + validates it.
 *   3. curated fallback — a hand-authored graph if the subject matches a seed.
 * If none apply (unknown subject + no AI), the caller surfaces a clear error.
 */
export async function resolveCurriculum(
  subject: string,
  goal?: string,
  userId?: string | null,
): Promise<ResolvedCurriculum> {
  const slug = slugifySubject(subject);

  const cached = await getCachedCurriculum(subject);
  if (cached) {
    return { curriculum: cached, source: "cache", goalConceptIds: goalIdsFor(slug, cached) };
  }

  let liveError: string | null = null;
  if (isAiConfigured()) {
    try {
      const { curriculum } = await architectCurriculum({ subject, goal, userId });
      return { curriculum, source: "live", goalConceptIds: goalIdsFor(slug, curriculum) };
    } catch (err) {
      liveError = err instanceof Error ? err.message : String(err);
      console.error("[resolve-curriculum] live architect failed:", liveError);
    }
  }

  const curated = SEED_SUBJECTS.find((s) => slugifySubject(s.subject) === slug);
  if (curated) {
    return {
      curriculum: curated.curriculum,
      source: "curated-fallback",
      goalConceptIds: curated.goalConceptIds,
    };
  }

  // Live models failed (429, timeout, bad graph). Still enroll with a valid DAG
  // so typed subjects never 502 during judging.
  if (liveError) {
    console.error("[resolve-curriculum] using static curriculum after:", liveError);
  }
  const fallback = staticCurriculum(subject, goal);
  return { curriculum: fallback, source: "static", goalConceptIds: goalIdsFor(slug, fallback) };
}

/** Goal targets: curated mapping if known, else the summit concepts (leaf nodes). */
function goalIdsFor(slug: string, curriculum: CurriculumOutput): string[] {
  const curated = SEED_SUBJECTS.find((s) => slugifySubject(s.subject) === slug);
  if (curated) return curated.goalConceptIds;

  // Leaf concepts (nothing depends on them) are the natural summit targets.
  const hasDependents = new Set<string>();
  for (const c of curriculum.concepts) {
    for (const p of c.prerequisiteIds) hasDependents.add(p);
  }
  const leaves = curriculum.concepts.filter((c) => !hasDependents.has(c.id)).map((c) => c.id);
  return leaves.length ? leaves : [curriculum.concepts[curriculum.concepts.length - 1].id];
}
