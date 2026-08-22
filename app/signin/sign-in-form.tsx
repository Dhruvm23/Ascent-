"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("climber@test.dev");
  const [password, setPassword] = useState("summit123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("That email and password don't match. Check them and try again.");
      return;
    }
    router.push("/map");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", marginTop: "1.25rem" }}>
      <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && (
        <p role="alert" style={{ color: "var(--misconception)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn-flag" disabled={busy} style={{ justifyContent: "center" }}>
        {busy ? "Checking…" : "Sign in →"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.1em" }} className="data">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "0.75rem 0.9rem",
          border: "1.5px solid var(--basalt)",
          borderRadius: "var(--radius)",
          background: "var(--vellum)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-md)",
        }}
      />
    </div>
  );
}
