import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseBody, enforceRateLimit } from "@/lib/http";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { gradeExplanation } from "@/lib/ai/agents/assessor";
import { staticGrading } from "@/lib/ai/fallback";
import { applyAnswer } from "@/lib/mastery";
import { sanitizeUserText } from "@/lib/ai/sanitize";

const schema = z.object({
  enrollmentId: z.string().min(1),
  conceptExternalId: z.string().min(1),
  text: z.string().min(1).max(4000),
  latencyMs: z.number().int().min(0).max(600_000).default(0),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(req, "feynman", 15, 60_000);
  if (limited) return limited;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const state = await loadActiveEnrollment(session.user.id);
  if (!state || state.enrollment.id !== parsed.data.enrollmentId) {
    return NextResponse.json({ error: "Enrolment not found." }, { status: 404 });
  }
  const concept = state.nodes.find((n) => n.id === parsed.data.conceptExternalId);
  if (!concept) return NextResponse.json({ error: "Concept not found." }, { status: 404 });

  const learnerText = sanitizeUserText(parsed.data.text);

  let grading;
  try {
    grading = await gradeExplanation({
      conceptName: concept.name,
      conceptDescription: concept.description ?? "",
      learnerText,
      mode: state.mode,
      userId: session.user.id,
    });
  } catch {
    grading = staticGrading({ conceptDescription: concept.description ?? "", learnerText });
  }

  const correct = grading.correctness >= 0.6 && !grading.misconception;
  const applied = await applyAnswer({
    enrollmentId: parsed.data.enrollmentId,
    conceptExternalId: parsed.data.conceptExternalId,
    correct,
    confidence: grading.completeness,
    latencyMs: parsed.data.latencyMs,
    answerChanges: 0,
    attempts: 1,
    type: "feynman",
  });

  // The grader's explicit misconception judgement wins over the heuristic.
  if (grading.misconception && !applied.misconception) {
    const dbId = state.conceptDbIds.get(concept.id);
    if (dbId) {
      await prisma.masteryState.update({
        where: { enrollmentId_conceptId: { enrollmentId: parsed.data.enrollmentId, conceptId: dbId } },
        data: { misconception: true },
      });
    }
  }

  return NextResponse.json({ grading, mastery: { ...applied, misconception: applied.misconception || grading.misconception } });
}
