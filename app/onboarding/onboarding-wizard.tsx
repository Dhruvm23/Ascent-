"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Wordmark } from "@/components/brand/mark";
import {
  INTEREST_SUGGESTIONS,
  MODE_META,
  PRESENTATION_MODES,
  type PresentationMode,
} from "@/lib/constants";
import { usePreferences } from "@/components/providers/preferences-provider";
import {
  pickNextItem,
  updateAbility,
  shouldStop,
  type DiagnosticItem,
} from "@/lib/engine/diagnostic";

type Choice = { id: string; text: string };
type Diagnostic = {
  id: string;
  conceptExternalId: string;
  difficulty: number;
  stem: string;
  choices: Choice[];
  answerId: string;
};

type Phase = "form" | "building" | "diagnostic" | "seeding";

export function OnboardingWizard({
  initialSubject,
  initialInterests,
  initialMode,
}: {
  initialSubject: string;
  initialInterests: string[];
  initialMode: PresentationMode;
}) {
  const router = useRouter();
  const { setMode: setGlobalMode } = usePreferences();

  const [phase, setPhase] = useState<Phase>("form");
  const [subject, setSubject] = useState(initialSubject);
  const [interests, setInterests] = useState<string[]>(initialInterests.slice(0, 3));
  const [customInterest, setCustomInterest] = useState("");
  const [mode, setMode] = useState<PresentationMode>(initialMode);
  const [goal, setGoal] = useState("");
  const [weeks, setWeeks] = useState(6);
  const [error, setError] = useState<string | null>(null);

  // Diagnostic state
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [items, setItems] = useState<Diagnostic[]>([]);
  const [asked, setAsked] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<Diagnostic | null>(null);
  const [theta, setTheta] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [responses, setResponses] = useState<{ conceptExternalId: string; correct: boolean }[]>([]);
  const [source, setSource] = useState<string>("");

  function toggleInterest(i: string) {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 3 ? [...prev, i] : prev,
    );
  }

  async function startBuild(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (subject.trim().length < 2) {
      setError("Tell us what you'd like to learn.");
      return;
    }
    setPhase("building");
    setGlobalMode(mode);

    const res = await fetch("/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), goal: goal.trim() || undefined, targetWeeks: weeks, interests, mode }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't build that route. Try another subject.");
      setPhase("form");
      return;
    }

    const data = await res.json();
    setEnrollmentId(data.enrollmentId);
    setSource(data.source);
    const diags: Diagnostic[] = (data.diagnostics ?? []).map(
      (d: { id: string; conceptExternalId: string; difficulty: number; stem: string; choices: unknown; answerId: string }) => ({
        ...d,
        choices: (d.choices as Choice[]) ?? [],
      }),
    );
    setItems(diags);

    if (diags.length === 0) {
      await finishDiagnostic(data.enrollmentId, 0, []);
      return;
    }
    const first = pickNextItem(0, toEngineItems(diags), new Set());
    const firstFull = diags.find((d) => d.id === first?.id) ?? diags[0];
    setCurrent(firstFull);
    setAsked(new Set([firstFull.id]));
    setPhase("diagnostic");
  }

  async function answerDiagnostic(choiceId: string) {
    if (!current || !enrollmentId) return;
    const correct = choiceId === current.answerId;
    const nextTheta = updateAbility(theta, current.difficulty, correct, answered);
    const nextAnswered = answered + 1;
    const nextResponses = [...responses, { conceptExternalId: current.conceptExternalId, correct }];
    setTheta(nextTheta);
    setAnswered(nextAnswered);
    setResponses(nextResponses);

    if (shouldStop(nextAnswered, Math.abs(nextTheta - theta))) {
      await finishDiagnostic(enrollmentId, nextTheta, nextResponses);
      return;
    }
    const nextAsked = new Set(asked).add(current.id);
    const next = pickNextItem(nextTheta, toEngineItems(items), nextAsked);
    if (!next) {
      await finishDiagnostic(enrollmentId, nextTheta, nextResponses);
      return;
    }
    setAsked(nextAsked);
    setCurrent(items.find((d) => d.id === next.id) ?? null);
  }

  async function finishDiagnostic(
    enrId: string,
    finalTheta: number,
    resp: { conceptExternalId: string; correct: boolean }[],
  ) {
    setPhase("seeding");
    await fetch("/api/diagnostic/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId: enrId, finalTheta, responses: resp }),
    });
    router.push("/map");
    router.refresh();
  }

  const progress = useMemo(
    () => (items.length ? Math.min(100, Math.round((answered / Math.min(8, items.length)) * 100)) : 0),
    [answered, items.length],
  );

  return (
    <>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}>
        <Mark size={26} />
        <Wordmark />
      </Link>

      {phase === "form" && (
        <form onSubmit={startBuild} style={{ display: "grid", gap: "2rem" }}>
          <div>
            <p className="eyebrow">Step 1 · Base camp</p>
            <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.4rem" }}>Plot your route</h1>
            <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
              Tell the engine what to build and how you learn. This shapes everything that follows.
            </p>
          </div>

          <Section title="What do you want to learn?">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Music Theory Fundamentals"
              aria-label="Subject"
              style={inputStyle}
            />
          </Section>

          <Section title="Anchor explanations to your interests" hint="Pick up to 3. Every explanation will use these as analogies.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {[...INTEREST_SUGGESTIONS, ...interests.filter((i) => !INTEREST_SUGGESTIONS.includes(i as never))].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={interests.includes(i)}
                  onClick={() => toggleInterest(i)}
                  className="btn-quiet"
                  style={{ background: interests.includes(i) ? "var(--summit)" : "transparent" }}
                >
                  {i}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <input
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                placeholder="Add your own…"
                aria-label="Add a custom interest"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  const v = customInterest.trim();
                  if (v && interests.length < 3) {
                    setInterests((p) => [...p, v]);
                    setCustomInterest("");
                  }
                }}
              >
                Add
              </button>
            </div>
          </Section>

          <Section title="How should Ascent present it?">
            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
              {PRESENTATION_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className="card"
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    borderWidth: mode === m ? "2px" : "1.5px",
                    background: mode === m ? "var(--vellum-inset)" : "var(--vellum)",
                    boxShadow: mode === m ? "3px 3px 0 var(--basalt)" : "none",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)" }}>
                    {MODE_META[m].label}
                  </div>
                  <div className="data" style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    {MODE_META[m].who}
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)", marginTop: "0.4rem", lineHeight: 1.4 }}>
                    {MODE_META[m].blurb}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="What's your goal?" hint="We'll reverse-engineer the route to your summit and pace it.">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Write my own songs"
              aria-label="Goal"
              style={inputStyle}
            />
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }} className="data">
              <span style={{ fontSize: "var(--text-sm)" }}>Target: {weeks} weeks</span>
              <input
                type="range"
                min={1}
                max={16}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                aria-label="Target weeks"
                style={{ flex: 1, accentColor: "var(--flag)" }}
              />
            </label>
          </Section>

          {error && (
            <p role="alert" style={{ color: "var(--misconception)" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn-flag" style={{ justifySelf: "start" }}>
            Build my route →
          </button>
        </form>
      )}

      {phase === "building" && (
        <BuildingState subject={subject} />
      )}

      {phase === "diagnostic" && current && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <p className="eyebrow">Step 2 · Diagnostic {source && `· ${source} route`}</p>
            <h1 style={{ fontSize: "var(--text-xl)", marginTop: "0.4rem" }}>
              A few questions to find your starting elevation
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", marginTop: "0.35rem" }}>
              Questions adapt to your answers — this seeds your knowledge graph so you don&apos;t start at zero.
            </p>
            <div style={{ height: 6, background: "var(--vellum-deep)", borderRadius: 3, marginTop: "1rem", overflow: "hidden", border: "1px solid var(--basalt)" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--flag)", transition: "width 250ms var(--ease-snappy)" }} />
            </div>
          </div>
          <div className="card" key={current.id}>
            <p style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>{current.stem}</p>
            <div style={{ display: "grid", gap: "0.6rem", marginTop: "1rem" }}>
              {current.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="btn-quiet"
                  style={{ justifyContent: "flex-start", textAlign: "left", fontFamily: "var(--font-body)" }}
                  onClick={() => answerDiagnostic(c.id)}
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "seeding" && <BuildingState subject={subject} seeding />}
    </>
  );
}

function BuildingState({ subject, seeding }: { subject: string; seeding?: boolean }) {
  return (
    <div style={{ display: "grid", gap: "1.5rem", placeItems: "start" }}>
      <p className="eyebrow">{seeding ? "Seeding your knowledge graph" : "Curriculum Architect at work"}</p>
      <h1 style={{ fontSize: "var(--text-xl)" }}>
        {seeding ? "Charting your Cognitive Fingerprint…" : `Mapping a route through ${subject}…`}
      </h1>
      <div style={{ display: "grid", gap: "0.6rem", width: "100%" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: "1.2rem", width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: "var(--text-lg)" }}>{title}</h2>
      {hint && <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", margin: "0.25rem 0 0.75rem" }}>{hint}</p>}
      <div style={{ marginTop: hint ? 0 : "0.75rem" }}>{children}</div>
    </div>
  );
}

function toEngineItems(diags: Diagnostic[]): DiagnosticItem[] {
  return diags.map((d) => ({ id: d.id, conceptId: d.conceptExternalId, difficulty: d.difficulty }));
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.85rem 1rem",
  border: "1.5px solid var(--basalt)",
  borderRadius: "var(--radius)",
  background: "var(--vellum-inset)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-md)",
};
