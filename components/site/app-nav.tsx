"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Mark, Wordmark } from "@/components/brand/mark";
import { MODE_META } from "@/lib/constants";
import { usePreferences } from "@/components/providers/preferences-provider";

export function AppNav() {
  const { mode } = usePreferences();
  return (
    <header style={{ borderBottom: "1.5px solid var(--basalt)", background: "var(--vellum-inset)" }}>
      <nav
        aria-label="Primary"
        className="container-map"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 0", gap: "1rem", flexWrap: "wrap" }}
      >
        <Link href="/map" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Mark size={24} />
          <Wordmark />
        </Link>
        <div className="data" style={{ display: "flex", alignItems: "center", gap: "1.1rem", fontSize: "var(--text-sm)" }}>
          <Link href="/map">Route map</Link>
          <Link href="/onboarding">New subject</Link>
          <Link href="/dev/logs">Agent logs</Link>
          <Link href="/settings">Settings</Link>
          <span
            title="Presentation mode"
            style={{ padding: "0.2rem 0.55rem", border: "1.5px solid var(--basalt)", borderRadius: "var(--radius)", background: "var(--summit)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {MODE_META[mode].label}
          </span>
          <button type="button" className="btn-quiet" style={{ padding: "0.4rem 0.8rem" }} onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
