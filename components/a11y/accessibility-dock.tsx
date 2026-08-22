"use client";

import { useState } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";
import { clamp } from "@/lib/utils";

/**
 * Always-available accessibility controls: reduced motion, dyslexia-friendly
 * font, and font scaling. Fully keyboard operable with an expandable panel.
 */
export function AccessibilityDock() {
  const [open, setOpen] = useState(false);
  const { motion, dyslexia, fontScale, setMotion, setDyslexia, setFontScale } = usePreferences();

  return (
    <div
      style={{ position: "fixed", left: "1rem", bottom: "1rem", zIndex: 60 }}
      className="data"
    >
      {open && (
        <div
          role="group"
          aria-label="Accessibility settings"
          className="card"
          style={{
            marginBottom: "0.6rem",
            display: "grid",
            gap: "0.75rem",
            minWidth: "16rem",
            padding: "1rem",
            boxShadow: "4px 4px 0 var(--basalt)",
          }}
        >
          <ToggleRow
            label="Animation"
            on={motion}
            onToggle={() => setMotion(!motion)}
            onText="On"
            offText="Reduced"
          />
          <ToggleRow
            label="Readable font"
            on={dyslexia}
            onToggle={() => setDyslexia(!dyslexia)}
            onText="On"
            offText="Off"
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <span style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Text size
            </span>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              <button
                type="button"
                className="btn-quiet"
                style={{ padding: "0.3rem 0.6rem" }}
                aria-label="Decrease text size"
                onClick={() => setFontScale(clamp(Number((fontScale - 0.05).toFixed(2)), 0.9, 1.4))}
              >
                A-
              </button>
              <button
                type="button"
                className="btn-quiet"
                style={{ padding: "0.3rem 0.6rem" }}
                aria-label="Increase text size"
                onClick={() => setFontScale(clamp(Number((fontScale + 0.05).toFixed(2)), 0.9, 1.4))}
              >
                A+
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        className="btn-quiet"
        aria-expanded={open}
        aria-label={open ? "Close accessibility settings" : "Open accessibility settings"}
        onClick={() => setOpen((o) => !o)}
        style={{ background: "var(--vellum-inset)", boxShadow: "3px 3px 0 var(--basalt)" }}
      >
        <span aria-hidden="true">◈</span> Access
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
  onText,
  offText,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  onText: string;
  offText: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className="btn-quiet"
        style={{ padding: "0.3rem 0.7rem", background: on ? "var(--summit)" : "transparent" }}
      >
        {on ? onText : offText}
      </button>
    </div>
  );
}
