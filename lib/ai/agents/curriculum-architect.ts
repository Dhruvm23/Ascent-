import { callLLM, extractJson } from "../client";
import { cacheKey } from "../cache";
import { curriculumPrompt } from "./prompts";
import { curriculumSchema, type CurriculumOutput } from "../schemas";
import { validateGraph } from "@/lib/engine/graph";
import type { ConceptNode, DifficultyTier } from "@/lib/engine/types";
import { slugifySubject } from "@/lib/utils";

/**
 * Curriculum Architect Agent.
 *
 * Turns ANY plain-language subject/goal into a validated, prerequisite-ordered
 * concept graph + seed diagnostics. The output is parsed through a strict Zod
 * schema AND run through the engine's graph validator (acyclic, resolvable
 * prerequisites, has a root) before it's allowed into the system. If it fails
 * either gate, we throw and the caller falls back to a cached graph.
 */

export class CurriculumInvalidError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(`Generated curriculum failed validation: ${errors.join("; ")}`);
    this.name = "CurriculumInvalidError";
    this.errors = errors;
  }
}

export interface ArchitectResult {
  curriculum: CurriculumOutput;
  modelServed: string | null;
  latencyMs: number;
  attempts: number;
  cached: boolean;
}

export async function architectCurriculum(args: {
  subject: string;
  goal?: string;
  userId?: string | null;
}): Promise<ArchitectResult> {
  const { subject, goal, userId } = args;
  const { system, user } = curriculumPrompt(subject, goal);

  const res = await callLLM({
    agent: "curriculum-architect",
    task: "curriculum",
    system,
    user,
    json: true,
    userId,
    // Cache by subject slug so identical subjects reuse the generation.
    cacheKey: cacheKey(["curriculum", slugifySubject(subject)]),
    // A graph that fails schema or cycle validation is a failure of THAT
    // model, not of live generation overall — retry the next model before
    // falling back to a cached/curated curriculum.
    validate: (text) => parseAndValidateCurriculum(text),
  });

  const curriculum = parseAndValidateCurriculum(res.text);

  return {
    curriculum,
    modelServed: res.modelServed,
    latencyMs: res.latencyMs,
    attempts: res.attempts,
    cached: res.cached,
  };
}

/** Parse raw model text -> validated curriculum. Exported for the offline script + tests. */
export function parseAndValidateCurriculum(raw: string): CurriculumOutput {
  const json = JSON.parse(extractJson(raw));
  const parsed = curriculumSchema.parse(json);

  // Engine-level validation on the concept graph.
  const nodes = curriculumToNodes(parsed);
  const validation = validateGraph(nodes);
  if (!validation.ok) throw new CurriculumInvalidError(validation.errors);

  // Drop diagnostics that reference concepts that don't exist.
  const conceptIds = new Set(parsed.concepts.map((c) => c.id));
  const diagnostics = parsed.diagnostics.filter(
    (d) => conceptIds.has(d.conceptId) && d.choices.some((c) => c.id === d.answerId),
  );
  if (diagnostics.length < 3) {
    throw new CurriculumInvalidError(["Fewer than 3 valid diagnostic items remained."]);
  }

  return { ...parsed, diagnostics };
}

export function curriculumToNodes(c: CurriculumOutput): ConceptNode[] {
  return c.concepts.map((concept) => ({
    id: concept.id,
    name: concept.name,
    description: concept.description,
    prerequisiteIds: concept.prerequisiteIds,
    difficultyTier: concept.difficultyTier as DifficultyTier,
  }));
}
