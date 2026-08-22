import Link from "next/link";
import { Mark, Wordmark } from "@/components/brand/mark";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create account — Ascent" };

export default function SignUpPage() {
  return (
    <main id="main" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem 1.25rem" }}>
      <div style={{ width: "min(100%, 26rem)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.75rem", justifyContent: "center" }}>
          <Mark size={30} />
          <Wordmark />
        </Link>
        <div className="card" style={{ boxShadow: "5px 5px 0 var(--basalt)" }}>
          <h1 style={{ fontSize: "var(--text-xl)" }}>Base camp</h1>
          <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", marginTop: "0.35rem" }}>
            Create an account to start mapping what you know.
          </p>
          <SignUpForm />
        </div>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "var(--text-sm)" }} className="data">
          Already climbing?{" "}
          <Link href="/signin" style={{ textDecoration: "underline" }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
