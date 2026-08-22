import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { decideNext, planGoalRoute } from "@/lib/ai/agents/path-planner";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await loadActiveEnrollment(session.user.id);
  if (!state) return NextResponse.json({ error: "No active enrolment." }, { status: 404 });

  const plan = decideNext(state.nodes, state.masteryMap, {
    goalConceptIds: state.enrollment.goalConceptIds,
  });
  const pace = planGoalRoute(
    state.nodes,
    state.masteryMap,
    state.enrollment.goalConceptIds,
    state.enrollment.targetWeeks,
  );

  const nextConcept = plan.conceptId
    ? state.nodes.find((n) => n.id === plan.conceptId)
    : null;

  return NextResponse.json({
    plan: { ...plan, nextConceptName: nextConcept?.name ?? null },
    pace,
  });
}
