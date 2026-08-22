import { getCachedCurriculum } from "@/lib/courses";
import { architectCurriculum } from "@/lib/ai/agents/curriculum-architect";
import { isAiConfigured } from "@/lib/ai/client";
import { SEED_SUBJECTS } from "@/lib/seed-data/subjects";
import { slugifySubject } from "@/lib/utils";
import type { CurriculumOutput } from "@/lib/ai/schemas";

export type CurriculumSource = "cache" | "live" | "curated-fallback";

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

  const preloaded = SEED_SUBJECTS.map((s) => s.subject).join(", ");

  if (!isAiConfigured()) {
    throw new Error(
      process.env["ASCENT_OFFLINE_FALLBACK"] === "1"
        ? `Live generation is off. Please use one of these subjects: ${preloaded}.`
        : `Couldn't build a live course right now. Please use one of these subjects: ${preloaded}.`,
    );
  }

  if (isRateLimited(liveError)) {
    throw new Error(
      `Live generation is rate-limited right now. Please use one of these subjects: ${preloaded}.`,
    );
  }

  throw new Error(
    `Couldn't generate a live course for that subject. Please use one of these subjects: ${preloaded}.`,
  );
}

function isRateLimited(message: string | null): boolean {
  if (!message) return false;
  return /429|rate limit|too many requests|free-models-per-day/i.test(message);
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
