import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { AppNav } from "@/components/site/app-nav";
import { LessonClient } from "./lesson-client";
import { MASTERY_THRESHOLD } from "@/lib/engine/bkt";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ conceptId: string }>;
}) {
  const user = await requireUser();
  const { conceptId } = await params;
  const externalId = decodeURIComponent(conceptId);

  const state = await loadActiveEnrollment(user.id);
  if (!state) redirect("/onboarding");

  const concept = state.nodes.find((n) => n.id === externalId);
  if (!concept) notFound();

  const mastery = state.masteryMap.get(concept.id);
  const prereqs = concept.prerequisiteIds.map((pid) => {
    const p = state.nodes.find((n) => n.id === pid);
    const pm = state.masteryMap.get(pid);
    return { id: pid, name: p?.name ?? pid, mastered: (pm?.pKnown ?? 0) >= MASTERY_THRESHOLD };
  });

  return (
    <>
      <AppNav />
      <main id="main" className="container-map" style={{ padding: "2rem 0 4rem", maxWidth: "56rem" }}>
        <LessonClient
          enrollmentId={state.enrollment.id}
          conceptExternalId={concept.id}
          conceptName={concept.name}
          conceptDescription={concept.description ?? ""}
          pKnown={mastery?.pKnown ?? 0.2}
          misconception={mastery?.misconception ?? false}
          prereqs={prereqs}
          interests={state.interests}
        />
      </main>
    </>
  );
}
