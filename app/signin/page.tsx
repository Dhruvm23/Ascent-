import Link from "next/link";
import { Mark, Wordmark } from "@/components/brand/mark";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in — Ascent" };

export default function SignInPage() {
  return (
    <main id="main" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem 1.25rem" }}>
      <div style={{ width: "min(100%, 26rem)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.75rem", justifyContent: "center" }}>
          <Mark size={30} />
          <Wordmark />
        </Link>
        <div className="card" style={{ boxShadow: "5px 5px 0 var(--basalt)" }}>
          <h1 style={{ fontSize: "var(--text-xl)" }}>Return to your route</h1>
          <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)", marginTop: "0.35rem" }}>
            Pick up your ascent exactly where you left it.
          </p>
          <SignInForm />
        </div>
        <div className="card" style={{ marginTop: "1rem", background: "var(--vellum-deep)" }}>
          <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>Demo credentials</p>
          <p className="data" style={{ fontSize: "var(--text-sm)", lineHeight: 1.7 }}>
            climber@test.dev · summit123 <span style={{ color: "var(--muted)" }}>(mid-journey)</span>
            <br />
            learner@test.dev · climbing123 <span style={{ color: "var(--muted)" }}>(fresh)</span>
          </p>
        </div>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "var(--text-sm)" }} className="data">
          New here?{" "}
          <Link href="/signup" style={{ textDecoration: "underline" }}>
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
