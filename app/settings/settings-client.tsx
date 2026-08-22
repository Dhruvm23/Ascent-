"use client";

import { useState } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";
import { MODE_META, PRESENTATION_MODES, type PresentationMode } from "@/lib/constants";

export function SettingsClient({ interests }: { interests: string[] }) {
  const { mode, setMode, motion, setMotion, dyslexia, setDyslexia, fontScale, setFontScale } = usePreferences();
  const [saved, setSaved] = useState(false);

  async function persistMode(m: PresentationMode) {
    setMode(m);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m }),
    });
    setSaved(true);
  }

  return (
    <div style={{ display: "grid", gap: "2rem", marginTop: "1.5rem" }}>
      <section>
        <h2 style={{ fontSize: "var(--text-lg)" }}>Presentation mode</h2>
        <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", margin: "0.25rem 0 1rem" }}>
          Changes tone, pacing, and density — and how the Tutor and Assessor agents write for you.
        </p>
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
          {PRESENTATION_MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => persistMode(m)}
              className="card"
              style={{ textAlign: "left", cursor: "pointer", background: mode === m ? "var(--vellum-inset)" : "var(--vellum)", boxShadow: mode === m ? "3px 3px 0 var(--basalt)" : "none" }}
            >
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}>{MODE_META[m].label}</div>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--muted)", marginTop: "0.3rem", lineHeight: 1.4 }}>{MODE_META[m].blurb}</p>
            </button>
          ))}
        </div>
        {saved && <p className="data" style={{ fontSize: "var(--text-sm)", color: "var(--valley)", marginTop: "0.6rem" }}>Saved.</p>}
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-lg)" }}>Accessibility</h2>
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <Row label="Animation & smooth scrolling" desc="Turn off for a calmer, motion-free experience.">
            <Toggle on={motion} onClick={() => setMotion(!motion)} onText="On" offText="Reduced" />
          </Row>
          <Row label="Readable (dyslexia-friendly) font" desc="Switches body text to a more legible face with looser spacing.">
            <Toggle on={dyslexia} onClick={() => setDyslexia(!dyslexia)} onText="On" offText="Off" />
          </Row>
          <Row label={`Text size — ${Math.round(fontScale * 100)}%`} desc="Scales all text without breaking the layout.">
            <input type="range" min={0.9} max={1.4} step={0.05} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} aria-label="Text size" style={{ width: "10rem", accentColor: "var(--flag)" }} />
          </Row>
        </div>
      </section>

      {interests.length > 0 && (
        <section>
          <h2 style={{ fontSize: "var(--text-lg)" }}>Analogy interests</h2>
          <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", marginTop: "0.25rem" }}>
            Explanations are drawn from: {interests.join(", ")}. Change these when you start a new subject.
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--muted)" }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onClick, onText, offText }: { on: boolean; onClick: () => void; onText: string; offText: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="btn-quiet" style={{ background: on ? "var(--summit)" : "transparent", minWidth: "6rem", justifyContent: "center" }}>
      {on ? onText : offText}
    </button>
  );
}
