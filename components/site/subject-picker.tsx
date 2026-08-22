"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PickerCourse {
  slug: string;
  title: string;
  subject: string;
  summary: string | null;
  conceptCount: number;
}

/**
 * The clearest proof the engine is subject-agnostic: three pre-loaded courses
 * from different domains, plus a field to type ANY subject and have the
 * Curriculum Architect build a course live.
 */
export function SubjectPicker({ courses }: { courses: PickerCourse[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const go = (subject: string) =>
    router.push(`/onboarding?subject=${encodeURIComponent(subject)}`);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().length >= 2) go(value.trim());
        }}
        style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}
      >
        <label htmlFor="subject-input" className="sr-only">
          Subject to learn
        </label>
        <input
          id="subject-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type any subject — e.g. Organic Chemistry, Chess Openings, Roman History…"
          style={{
            flex: "1 1 22rem",
            padding: "0.9rem 1rem",
            border: "1.5px solid var(--basalt)",
            borderRadius: "var(--radius)",
            background: "var(--vellum-inset)",
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-md)",
          }}
        />
        <button type="submit" className="btn-flag">
          Plot my route →
        </button>
      </form>

      <div>
        <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>
          Or start with a pre-loaded route
        </p>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          }}
        >
          {courses.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => go(c.subject)}
              className="card"
              style={{ textAlign: "left", cursor: "pointer", display: "grid", gap: "0.4rem" }}
            >
              <span className="data" style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                {c.conceptCount} waypoints
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)" }}>
                {c.title}
              </span>
              {c.summary && (
                <span style={{ fontSize: "var(--text-sm)", color: "var(--muted)", lineHeight: 1.4 }}>
                  {c.summary}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
