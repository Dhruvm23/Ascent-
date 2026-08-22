/**
 * Ascent mark: nested contour rings rising to a summit with a survey flag.
 * The brand is the map — the mark is a single waypoint on it.
 */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 30 C7 30 2 25 2 22 C2 20 5 19 8 19 M16 30 C25 30 30 25 30 22 C30 20 27 19 24 19"
        stroke="var(--contour)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M16 25 C10 25 6 22 6 20 M16 25 C22 25 26 22 26 20"
        stroke="var(--contour)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* peak */}
      <path
        d="M16 4 L25 20 L7 20 Z"
        stroke="var(--basalt)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="var(--vellum-inset)"
      />
      <path d="M16 4 L20.5 12 L11.5 12 Z" fill="var(--basalt)" />
      {/* flag */}
      <line x1="16" y1="4" x2="16" y2="1" stroke="var(--basalt)" strokeWidth="1.4" />
      <path d="M16 1.5 L21 3 L16 4.5 Z" fill="var(--flag)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        fontSize: "1.25rem",
      }}
    >
      Ascent
    </span>
  );
}
