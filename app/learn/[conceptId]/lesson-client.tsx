"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/components/providers/preferences-provider";
import { toParagraphs } from "@/lib/safe";
import { masteryColor } from "@/lib/utils";

type Choice = { id: string; text: string };
type QuizItem = { stem: string; choices: Choice[]; answerId: string; explanation?: string };
type Radar = { label: string; misconceptionScore: number; calibrationGap: number; notes: string[] };
type Prereq = { id: string; name: string; mastered: boolean };

const RADAR_COPY: Record<string, { title: string; tone: string }> = {
  solid: { title: "Solid — confident and correct", tone: "var(--valley)" },
  shaky: { title: "Right, but unsure — worth reinforcing", tone: "var(--ridge)" },
  unmastered: { title: "Not there yet — let's keep working it", tone: "var(--slate)" },
  misconception: { title: "Misconception detected — confidently off-track", tone: "var(--misconception)" },
};

export function LessonClient(props: {
  enrollmentId: string;
  conceptExternalId: string;
  conceptName: string;
  conceptDescription: string;
  pKnown: number;
  misconception: boolean;
  prereqs: Prereq[];
  interests: string[];
}) {
  const router = useRouter();
  const { motion } = usePreferences();
  const [phase, setPhase] = useState<"read" | "quiz" | "feynman" | "done">("read");
  const [explanation, setExplanation] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [pKnown, setPKnown] = useState(props.pKnown);

  const startedOnce = useRef(false);

  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    (async () => {
      try {
        const res = await fetch("/api/lesson/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptExternalId: props.conceptExternalId }),
        });
        if (!res.body) {
          setExplanation("We couldn't load an explanation right now. Try the quiz below to test what you know.");
          setStreaming(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          setExplanation((prev) => prev + decoder.decode(value, { stream: true }));
        }
      } catch {
        setExplanation("We couldn't load an explanation right now. Try the quiz below.");
      } finally {
        setStreaming(false);
      }
    })();
  }, [props.conceptExternalId]);

  function toggleSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(explanation);
    u.onend = () => setSpeaking(false);
    u.rate = 1;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <Link href="/map" className="data" style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>
          ← Back to route map
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          <div>
            <p className="eyebrow">Waypoint</p>
            <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.3rem" }}>{props.conceptName}</h1>
          </div>
          <MasteryDial pKnown={pKnown} />
        </div>
        {props.prereqs.some((p) => !p.mastered) && (
          <p className="data" style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: "0.6rem" }}>
            Builds on: {props.prereqs.map((p) => `${p.name}${p.mastered ? " ✓" : ""}`).join(" · ")}
          </p>
        )}
      </div>

      {/* Explanation */}
      <section className="card" aria-live="polite">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <p className="eyebrow">
            Tutor {props.interests.length ? `· via ${props.interests[0]}` : ""}
          </p>
          <button type="button" className="btn-quiet" style={{ padding: "0.35rem 0.7rem" }} onClick={toggleSpeech} aria-pressed={speaking}>
            {speaking ? "◼ Stop" : "▶ Listen"}
          </button>
        </div>
        {explanation === "" && streaming ? (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: "1rem", width: `${95 - i * 10}%` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {toParagraphs(explanation).map((p, i) => (
              <p key={i} style={{ lineHeight: 1.65 }}>
                {p}
                {streaming && i === toParagraphs(explanation).length - 1 && (
                  <span aria-hidden="true" style={{ opacity: motion ? 1 : 0 }}> ▌</span>
                )}
              </p>
            ))}
          </div>
        )}
        {phase === "read" && !streaming && (
          <button type="button" className="btn-flag" style={{ marginTop: "1.25rem" }} onClick={() => setPhase("quiz")}>
            Check my understanding →
          </button>
        )}
      </section>

      {phase === "quiz" && (
        <QuizSection
          enrollmentId={props.enrollmentId}
          conceptExternalId={props.conceptExternalId}
          onMasteryChange={setPKnown}
          onDone={() => setPhase("feynman")}
        />
      )}

      {phase === "feynman" && (
        <FeynmanSection
          enrollmentId={props.enrollmentId}
          conceptExternalId={props.conceptExternalId}
          conceptName={props.conceptName}
          onMasteryChange={setPKnown}
          onDone={() => setPhase("done")}
        />
      )}

      {phase === "done" && (
        <section className="card" style={{ borderColor: "var(--flag)", boxShadow: "4px 4px 0 var(--flag)" }}>
          <p className="eyebrow">Waypoint logged</p>
          <p style={{ fontSize: "var(--text-md)", margin: "0.5rem 0 1rem" }}>
            Your Cognitive Fingerprint updated. The planner has re-routed based on what you just showed.
          </p>
          <button type="button" className="btn-flag" onClick={() => { router.push("/map"); router.refresh(); }}>
            See your updated route →
          </button>
        </section>
      )}
    </div>
  );
}

function QuizSection({
  enrollmentId,
  conceptExternalId,
  onMasteryChange,
  onDone,
}: {
  enrollmentId: string;
  conceptExternalId: string;
  onMasteryChange: (p: number) => void;
  onDone: () => void;
}) {
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);
  const [confidence, setConfidence] = useState(0.6);
  const [radar, setRadar] = useState<Radar | null>(null);
  const [busy, setBusy] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
    fetch("/api/assess/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptExternalId, count: 2 }),
    })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [conceptExternalId]);

  if (!items) {
    return (
      <section className="card">
        <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Assessor · preparing questions</p>
        <div className="skeleton" style={{ height: "3rem" }} />
      </section>
    );
  }
  if (items.length === 0) {
    return (
      <section className="card">
        <p>No questions available. Move on to explaining it back.</p>
        <button type="button" className="btn-flag" style={{ marginTop: "1rem" }} onClick={onDone}>Continue →</button>
      </section>
    );
  }

  const item = items[idx];

  async function submit() {
    if (selected === null) return;
    setBusy(true);
    const correct = selected === item.answerId;
    const latencyMs = Date.now() - startRef.current;
    const res = await fetch("/api/assess/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, conceptExternalId, correct, confidence, latencyMs, answerChanges: changes, attempts: 1 }),
    });
    const data = await res.json();
    setBusy(false);
    setRadar(data.radar);
    onMasteryChange(data.pKnown);
  }

  function next() {
    if (!items) return;
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setSelected(null);
      setChanges(0);
      setConfidence(0.6);
      setRadar(null);
      startRef.current = Date.now();
    } else {
      onDone();
    }
  }

  return (
    <section className="card" aria-live="polite">
      <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>
        Assessor · question {idx + 1} of {items.length}
      </p>
      <p style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>{item.stem}</p>
      <div style={{ display: "grid", gap: "0.6rem", marginTop: "1rem" }}>
        {item.choices.map((c) => {
          const isSel = selected === c.id;
          const answered = radar !== null;
          const isCorrect = c.id === item.answerId;
          const bg = answered
            ? isCorrect
              ? "color-mix(in srgb, var(--valley) 25%, transparent)"
              : isSel
                ? "color-mix(in srgb, var(--misconception) 20%, transparent)"
                : "transparent"
            : isSel
              ? "var(--summit)"
              : "transparent";
          return (
            <button
              key={c.id}
              type="button"
              data-testid="quiz-choice"
              disabled={answered}
              className="btn-quiet"
              aria-pressed={isSel}
              style={{ justifyContent: "flex-start", textAlign: "left", fontFamily: "var(--font-body)", background: bg }}
              onClick={() => {
                if (selected !== null && selected !== c.id) setChanges((n) => n + 1);
                setSelected(c.id);
              }}
            >
              {c.text}
            </button>
          );
        })}
      </div>

      {radar === null ? (
        <div style={{ marginTop: "1.25rem" }}>
          <label className="data" style={{ display: "block", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
            How confident are you? ({Math.round(confidence * 100)}%)
          </label>
          <input type="range" min={0} max={1} step={0.1} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--flag)" }} aria-label="Confidence" />
          <button type="button" className="btn-flag" style={{ marginTop: "1rem" }} disabled={selected === null || busy} onClick={submit}>
            {busy ? "Checking…" : "Submit answer →"}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: "1.25rem", borderTop: "1.5px solid var(--basalt)", paddingTop: "1rem" }}>
          <p style={{ fontWeight: 700, color: RADAR_COPY[radar.label]?.tone }}>
            {RADAR_COPY[radar.label]?.title ?? radar.label}
          </p>
          {item.explanation && <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)", marginTop: "0.4rem", lineHeight: 1.5 }}>{item.explanation}</p>}
          {radar.notes.length > 0 && (
            <p className="data" style={{ fontSize: "var(--text-xs)", color: "var(--muted)", marginTop: "0.5rem" }}>
              Radar: {radar.notes.join(" ")}
            </p>
          )}
          <button type="button" className="btn-flag" style={{ marginTop: "1rem" }} onClick={next}>
            {idx + 1 < items.length ? "Next question →" : "Explain it back →"}
          </button>
        </div>
      )}
    </section>
  );
}

function FeynmanSection({
  enrollmentId,
  conceptExternalId,
  conceptName,
  onMasteryChange,
  onDone,
}: {
  enrollmentId: string;
  conceptExternalId: string;
  conceptName: string;
  onMasteryChange: (p: number) => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [grading, setGrading] = useState<{ correctness: number; completeness: number; misconception: boolean; misconceptionNote: string; feedback: string } | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  async function submit() {
    if (text.trim().length < 10) return;
    setBusy(true);
    const res = await fetch("/api/assess/feynman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, conceptExternalId, text, latencyMs: Date.now() - startRef.current }),
    });
    const data = await res.json();
    setBusy(false);
    setGrading(data.grading);
    if (data.mastery?.pKnown != null) onMasteryChange(data.mastery.pKnown);
  }

  return (
    <section className="card" aria-live="polite">
      <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Explain it back (Feynman check)</p>
      <label htmlFor="feynman" style={{ fontSize: "var(--text-md)", display: "block", marginBottom: "0.6rem" }}>
        In your own words, explain <strong>{conceptName}</strong> as if teaching a friend.
      </label>
      <textarea
        id="feynman"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        disabled={grading !== null}
        style={{ width: "100%", padding: "0.85rem 1rem", border: "1.5px solid var(--basalt)", borderRadius: "var(--radius)", background: "var(--vellum-inset)", fontFamily: "var(--font-body)", fontSize: "var(--text-md)", resize: "vertical" }}
        placeholder="Type your explanation…"
      />
      {grading === null ? (
        <button type="button" className="btn-flag" style={{ marginTop: "1rem" }} disabled={busy || text.trim().length < 10} onClick={submit}>
          {busy ? "Grading…" : "Submit explanation →"}
        </button>
      ) : (
        <div style={{ marginTop: "1rem", borderTop: "1.5px solid var(--basalt)", paddingTop: "1rem", display: "grid", gap: "0.75rem" }}>
          <div className="data" style={{ display: "flex", gap: "1.5rem", fontSize: "var(--text-sm)" }}>
            <span>Accuracy: <strong>{Math.round(grading.correctness * 100)}%</strong></span>
            <span>Completeness: <strong>{Math.round(grading.completeness * 100)}%</strong></span>
          </div>
          {grading.misconception && grading.misconceptionNote && (
            <p style={{ color: "var(--misconception)", fontSize: "var(--text-sm)" }}>
              <strong>Misconception:</strong> {grading.misconceptionNote}
            </p>
          )}
          <p style={{ lineHeight: 1.55 }}>{grading.feedback}</p>
          <button type="button" className="btn-flag" onClick={onDone}>Finish waypoint →</button>
        </div>
      )}
    </section>
  );
}

function MasteryDial({ pKnown }: { pKnown: number }) {
  const pct = Math.round(pKnown * 100);
  return (
    <div className="data" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <span
        style={{ width: 40, height: 40, borderRadius: "50%", background: masteryColor(pKnown), border: "2px solid var(--basalt)", display: "grid", placeItems: "center", fontSize: "var(--text-xs)", fontWeight: 700, transition: "background 400ms var(--ease-snappy)" }}
        aria-hidden="true"
      >
        {pct}
      </span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        P(known)
      </span>
    </div>
  );
}
