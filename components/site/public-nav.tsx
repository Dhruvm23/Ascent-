import Link from "next/link";
import { Mark, Wordmark } from "@/components/brand/mark";

export function PublicNav() {
  return (
    <nav
      aria-label="Primary"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 0",
      }}
      className="container-map"
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Mark size={26} />
        <Wordmark />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }} className="data">
        <Link href="#how" style={{ fontSize: "var(--text-sm)" }}>
          How it works
        </Link>
        <Link href="/signin" style={{ fontSize: "var(--text-sm)" }}>
          Sign in
        </Link>
        <Link href="/onboarding" className="btn-flag" style={{ padding: "0.55rem 1rem" }}>
          Start climbing
        </Link>
      </div>
    </nav>
  );
}
