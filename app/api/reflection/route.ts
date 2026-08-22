import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { decideNext } from "@/lib/ai/agents/path-planner";
import { summarizeProgress } from "@/lib/ai/agents/reflection";
import { staticReflection } from "@/lib/ai/fallback";
import { MASTERY_THRESHOLD } from "@/lib/engine/bkt";
import { enforceRateLimit } from "@/lib/http";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(req, "reflection", 15, 60_000);
  if (limited) return limited;

  const state = await loadActiveEnrollment(session.user.id);
  if (!state) return NextResponse.json({ error: "No active enrolment." }, { status: 404 });

  const total = state.nodes.length;
  const mastered = state.nodes.filter(
    (n) => (state.masteryMap.get(n.id)?.pKnown ?? 0) >= MASTERY_THRESHOLD,
  ).length;
  const misconceptions = state.nodes.filter((n) => state.masteryMap.get(n.id)?.misconception);
  const plan = decideNext(state.nodes, state.masteryMap, {
    goalConceptIds: state.enrollment.goalConceptIds,
  });
  const nextConcept = plan.conceptId ? state.nodes.find((n) => n.id === plan.conceptId) : null;

  const summaryData = [
    `Mastered: ${mastered}/${total} concepts.`,
    `Goal: ${state.enrollment.goalText ?? "general mastery"}.`,
    misconceptions.length
      ? `Flagged misconceptions: ${misconceptions.map((m) => m.name).join(", ")}.`
      : "No misconceptions flagged.",
    `Recommended next action: ${plan.action}${nextConcept ? ` on "${nextConcept.name}"` : ""}.`,
  ].join("\n");

  let text: string;
  try {
    text = await summarizeProgress({
      courseTitle: state.course.title,
      mode: state.mode,
      summaryData,
      userId: session.user.id,
    });
  } catch {
    text = staticReflection({
      masteredCount: mastered,
      totalCount: total,
      nextConceptName: nextConcept?.name,
    });
  }

  return NextResponse.json({ text });
}
