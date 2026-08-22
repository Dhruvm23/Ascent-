import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { AppNav } from "@/components/site/app-nav";
import { RouteMap, type MapNode } from "@/components/map/route-map";
import { ReflectionCard } from "@/components/map/reflection-card";
import { computeElevation, extractSubgraph } from "@/lib/engine/graph";
import { isDue } from "@/lib/engine/sm2";
import { MASTERY_THRESHOLD } from "@/lib/engine/bkt";
import { decideNext, planGoalRoute } from "@/lib/ai/agents/path-planner";
import { masteryToElevation } from "@/lib/utils";

export const metadata = { title: "Route map — Ascent" };
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const user = await requireUser();
  const state = await loadActiveEnrollment(user.id);
  if (!state) redirect("/onboarding");

  const { nodes, masteryMap, enrollment, course } = state;
  const elevation = computeElevation(nodes);
  const goalSet = extractSubgraph(nodes, enrollment.goalConceptIds);
  const now = new Date();

  const mapNodes: MapNode[] = nodes.map((n) => {
    const m = masteryMap.get(n.id);
    return {
      id: n.id,
      name: n.name,
      pKnown: m?.pKnown ?? 0.2,
      misconception: m?.misconception ?? false,
      due: m ? m.sm2.repetitions > 0 && isDue(m.sm2, now) : false,
      elevation: elevation.get(n.id) ?? 0,
      prerequisiteIds: n.prerequisiteIds,
      isGoal: goalSet.has(n.id),
    };
  });

  const plan = decideNext(nodes, masteryMap, { goalConceptIds: enrollment.goalConceptIds });
  const pace = planGoalRoute(nodes, masteryMap, enrollment.goalConceptIds, enrollment.targetWeeks, now);

  const mastered = mapNodes.filter((n) => n.pKnown >= MASTERY_THRESHOLD).length;
  const misconceptions = mapNodes.filter((n) => n.misconception);
  const dueReviews = mapNodes.filter((n) => n.due);
  const nextName = plan.conceptId ? nodes.find((n) => n.id === plan.conceptId)?.name : null;
  const currentElevation = masteryToElevation(pace.progress);

  return (
    <>
      <AppNav />
      <main id="main" className="container-map" style={{ padding: "2rem 0 4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <p className="eyebrow">Your route · {course.subject}</p>
            <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.35rem" }}>{course.title}</h1>
          </div>
          <div className="data" style={{ textAlign: "right" }}>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 700 }}>{currentElevation.toLocaleString()}m</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Elevation · {mastered}/{mapNodes.length} summited
            </div>
          </div>
        </div>

        <div className="app-shell" style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <RouteMap nodes={mapNodes} currentConceptId={plan.conceptId} />
            <MasteryLegend />
          </div>

          <aside style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
            {/* Next action */}
            <div className="card" style={{ borderColor: "var(--flag)", boxShadow: "4px 4px 0 var(--flag)" }}>
              <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>
                {plan.action === "review" ? "Review due" : plan.action === "remediate" ? "Clear a misconception" : plan.action === "goal-complete" ? "Summit reached" : "Next foothold"}
              </p>
              <p style={{ fontSize: "var(--text-md)", lineHeight: 1.5 }}>{plan.reason}</p>
              {plan.conceptId && (
                <Link href={`/learn/${encodeURIComponent(plan.conceptId)}`} className="btn-flag" style={{ marginTop: "1rem" }}>
                  {plan.action === "review" ? "Review" : "Climb"} {nextName} →
                </Link>
              )}
            </div>

            {/* Goal pace */}
            <div className="card">
              <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Route to the summit</p>
              {enrollment.goalText && (
                <p style={{ fontSize: "var(--text-sm)", fontStyle: "italic", color: "var(--muted)", marginBottom: "0.6rem" }}>
                  “{enrollment.goalText}”
                </p>
              )}
              <div style={{ height: 10, background: "var(--vellum-deep)", border: "1.5px solid var(--basalt)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(pace.progress * 100)}%`, height: "100%", background: "var(--summit)" }} />
              </div>
              <p className="data" style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: "0.5rem" }}>
                {pace.masteredCount}/{pace.requiredCount} required concepts · {pace.remainingCount} to go ·
                pace {pace.conceptsPerWeek}/wk over {pace.targetWeeks} wks
              </p>
            </div>

            {/* Reviews due */}
            {dueReviews.length > 0 && (
              <div className="card">
                <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Fading — review before decay</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.4rem" }}>
                  {dueReviews.map((r) => (
                    <li key={r.id}>
                      <Link href={`/learn/${encodeURIComponent(r.id)}`} className="data" style={{ fontSize: "var(--text-sm)", display: "flex", justifyContent: "space-between" }}>
                        <span>{r.name}</span>
                        <span aria-hidden="true" style={{ color: "var(--flag)" }}>due →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Misconceptions */}
            {misconceptions.length > 0 && (
              <div className="card" style={{ borderColor: "var(--misconception)" }}>
                <p className="eyebrow" style={{ marginBottom: "0.6rem", color: "var(--misconception)" }}>
                  Misconceptions flagged
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.4rem" }}>
                  {misconceptions.map((m) => (
                    <li key={m.id}>
                      <Link href={`/learn/${encodeURIComponent(m.id)}`} className="data" style={{ fontSize: "var(--text-sm)" }}>
                        {m.name} — needs re-explaining
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ReflectionCard />
          </aside>
        </div>
      </main>
    </>
  );
}

function MasteryLegend() {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", padding: "0.9rem 1.2rem" }}>
      <span className="eyebrow">Mastery = elevation</span>
      <div style={{ flex: "1 1 12rem", height: 10, borderRadius: 5, border: "1.5px solid var(--basalt)", background: "linear-gradient(90deg, var(--valley), var(--ridge), var(--summit))" }} />
      <div className="data" style={{ display: "flex", gap: "1rem", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
        <span>Valley (learning)</span>
        <span>Summit (mastered)</span>
      </div>
      <div className="data" style={{ display: "flex", gap: "0.8rem", fontSize: "var(--text-xs)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--flag)", border: "1.5px solid var(--basalt)" }} /> review due
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--misconception)" }} /> misconception
        </span>
      </div>
    </div>
  );
}
