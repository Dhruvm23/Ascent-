import "dotenv/config";
import { prisma } from "../lib/db";
import { SEED_SUBJECTS } from "../lib/seed-data/subjects";
import { architectCurriculum, curriculumToNodes } from "../lib/ai/agents/curriculum-architect";
import { ensureCourse } from "../lib/courses";
import { validateGraph } from "../lib/engine/graph";
import { isAiConfigured } from "../lib/ai/client";
import { slugifySubject } from "../lib/utils";
import type { CurriculumOutput } from "../lib/ai/schemas";

/**
 * Offline curriculum generation.
 *
 * Runs the Curriculum Architect Agent (NOT in the UI) to pre-generate and cache
 * two subjects from clearly different domains than Music Theory — Cell Biology
 * and Causes of World War I — validating each graph (no cycles, resolvable
 * prerequisites) before committing it to the cache. If OpenRouter isn't
 * configured or every model fails, it falls back to the curated graph so the
 * cache is always populated and valid. Run with:  npm run cache:subjects
 */

const TARGET_SUBJECTS = ["Cell Biology Basics", "Causes of World War I"];

async function main() {
  const configured = isAiConfigured();
  console.log(
    configured
      ? "OpenRouter configured — attempting LIVE generation via the Curriculum Architect.\n"
      : "OpenRouter not configured — using curated fallback graphs (still validated + cached).\n",
  );

  for (const subject of TARGET_SUBJECTS) {
    const curated = SEED_SUBJECTS.find((s) => s.subject === subject);
    if (!curated) {
      console.warn(`No curated fallback for "${subject}" — skipping.`);
      continue;
    }

    let curriculum: CurriculumOutput = curated.curriculum;
    let source = "curated fallback";
    let model = "n/a";

    if (configured) {
      try {
        const result = await architectCurriculum({
          subject,
          goal: curated.goalText,
        });
        curriculum = result.curriculum; // already schema+graph validated inside
        source = "LIVE (Curriculum Architect)";
        model = result.modelServed ?? "unknown";
      } catch (err) {
        console.warn(
          `  ! Live generation failed for "${subject}" (${
            err instanceof Error ? err.message : err
          }). Falling back to curated graph.`,
        );
      }
    }

    // Validate no cycles / resolvable prerequisites before committing.
    const validation = validateGraph(curriculumToNodes(curriculum));
    if (!validation.ok) {
      console.error(`  ✗ "${subject}" failed validation: ${validation.errors.join("; ")}`);
      console.error("    Refusing to cache an invalid graph.");
      continue;
    }

    await ensureCourse({ subject, curriculum, isCached: true });
    console.log(
      `  ✓ ${subject} — ${curriculum.concepts.length} concepts, ${curriculum.diagnostics.length} diagnostics ` +
        `[${source}${model !== "n/a" ? `, model: ${model}` : ""}] cached as "${slugifySubject(subject)}"`,
    );
  }

  console.log("\nDone. All target subjects validated and cached.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
