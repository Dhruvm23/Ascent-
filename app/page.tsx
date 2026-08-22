import Link from "next/link";
import { prisma } from "@/lib/db";
import { PublicNav } from "@/components/site/public-nav";
import { TopoHero } from "@/components/brand/topo-hero";
import { SubjectPicker, type PickerCourse } from "@/components/site/subject-picker";
import { Reveal } from "@/components/motion/reveal";
import { Mark } from "@/components/brand/mark";

export const dynamic = "force-dynamic";

const LOOP = [
  { n: "01", name: "Curriculum Architect", body: "Type any subject. An agent builds a prerequisite-ordered concept graph and validates it." },
  { n: "02", name: "Diagnostic", body: "A short adaptive pretest finds your level and seeds your knowledge graph — you never start at zero." },
  { n: "03", name: "Tutor", body: "Explanations are generated through an analogy from your own interests, tuned to your mode." },
  { n: "04", name: "Assessor", body: "Quizzes and 'explain-it-back' answers are graded, catching misconceptions specifically." },
  { n: "05", name: "Confusion Radar", body: "Response time, answer-changes, and confidence separate a wrong guess from a firmly-held wrong idea." },
  { n: "06", name: "Path Planner", body: "Your graph updates and the next best foothold is chosen — prerequisite-aware, goal-biased." },
];

export default async function Home() {
  const courses = await prisma.course.findMany({
    where: { isCached: true },
    include: { _count: { select: { concepts: true } } },
    orderBy: { createdAt: "asc" },
  });

  const pickerCourses: PickerCourse[] = courses.map((c) => ({
    slug: c.slug,
    title: c.title,
    subject: c.subject,
    summary: c.summary,
    conceptCount: c._count.concepts,
  }));

  return (
    <>
      <PublicNav />
      <main id="main">
        {/* HERO */}
        <section className="container-map" style={{ padding: "3rem 0 4.5rem" }}>
          <div
            style={{
              display: "grid",
              gap: "2.5rem",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
              alignItems: "center",
            }}
            className="hero-grid"
          >
            <div>
              <p className="eyebrow" style={{ marginBottom: "1.25rem" }}>
                Adaptive learning · Cognitive Fingerprint engine
              </p>
              <h1 style={{ fontSize: "var(--text-3xl)", margin: 0 }}>
                Everyone climbs
                <br />
                differently.
              </h1>
              <p
                style={{
                  fontSize: "var(--text-lg)",
                  color: "var(--muted)",
                  maxWidth: "34rem",
                  marginTop: "1.25rem",
                  lineHeight: 1.5,
                }}
              >
                Ascent maps what you know as a route up a mountain, then plots the next
                foothold for you alone — adaptive explanations, misconception-aware
                assessment, and a knowledge graph that gains elevation as you learn.
              </p>
              <div style={{ display: "flex", gap: "0.8rem", marginTop: "2rem", flexWrap: "wrap" }}>
                <Link href="/onboarding" className="btn-flag">
                  Start your ascent →
                </Link>
                <Link href="#how" className="btn-quiet">
                  See the engine
                </Link>
              </div>
            </div>
            <div className="card" style={{ padding: "1rem", background: "var(--vellum)" }}>
              <TopoHero />
              <p
                className="data"
                style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: "0.5rem", textAlign: "center" }}
              >
                YOUR ROUTE · VALLEY → SUMMIT · MASTERY GAINS ELEVATION
              </p>
            </div>
          </div>
        </section>

        {/* SUBJECT PICKER */}
        <section
          style={{ background: "var(--vellum-deep)", borderTop: "1.5px solid var(--basalt)", borderBottom: "1.5px solid var(--basalt)" }}
        >
          <div className="container-map" style={{ padding: "3.5rem 0" }}>
            <Reveal>
              <h2 style={{ fontSize: "var(--text-2xl)", maxWidth: "30rem" }}>
                Learn anything. The engine doesn&apos;t care what.
              </h2>
              <p style={{ color: "var(--muted)", maxWidth: "40rem", margin: "0.75rem 0 2rem" }}>
                The same agents build a working course for music theory, cell biology, or the
                causes of World War I — or whatever you type in. Three routes are pre-loaded so
                you can see it instantly.
              </p>
            </Reveal>
            <SubjectPicker courses={pickerCourses} />
          </div>
        </section>

        {/* HOW IT WORKS — the connected loop */}
        <section id="how" className="container-map" style={{ padding: "4rem 0" }}>
          <Reveal>
            <p className="eyebrow">The connected loop</p>
            <h2 style={{ fontSize: "var(--text-2xl)", maxWidth: "34rem", marginTop: "0.5rem" }}>
              Six cooperating agents, one living knowledge graph.
            </h2>
          </Reveal>
          <div
            className="loop-grid"
            style={{
              marginTop: "2rem",
              background: "var(--basalt)",
              border: "1.5px solid var(--basalt)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            {LOOP.map((step) => (
              <Reveal key={step.n}>
                <div style={{ background: "var(--vellum-inset)", padding: "1.5rem", height: "100%" }}>
                  <div className="data" style={{ fontSize: "var(--text-xl)", color: "var(--flag)", fontWeight: 700 }}>
                    {step.n}
                  </div>
                  <h3 style={{ fontSize: "var(--text-lg)", margin: "0.5rem 0" }}>{step.name}</h3>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)", lineHeight: 1.5 }}>
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1.5px solid var(--basalt)" }}>
        <div
          className="container-map"
          style={{ padding: "2rem 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Mark size={22} />
            <span className="data" style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
              Ascent — everyone climbs differently.
            </span>
          </div>
          <Link href="/dev/logs" className="data" style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
            Agent efficiency logs →
          </Link>
        </div>
      </footer>
    </>
  );
}
