"use client";

import { useEffect, useState } from "react";

/** Reflection Agent summary, fetched client-side so the map renders instantly. */
export function ReflectionCard() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/reflection")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => active && setText(d.text))
      .catch(() => active && setText("Keep climbing — every answer sharpens your route."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="card" style={{ background: "var(--vellum-deep)" }}>
      <p className="eyebrow" style={{ marginBottom: "0.6rem" }}>Reflection</p>
      {loading ? (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <div className="skeleton" style={{ height: "0.9rem", width: "100%" }} />
          <div className="skeleton" style={{ height: "0.9rem", width: "80%" }} />
        </div>
      ) : (
        <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.55 }}>{text}</p>
      )}
    </div>
  );
}
