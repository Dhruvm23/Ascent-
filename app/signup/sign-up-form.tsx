"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't create your account. Try a different email.");
      setBusy(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "1rem", marginTop: "1.25rem" }}>
      <Field id="name" label="Name (optional)" type="text" value={name} onChange={setName} required={false} />
      <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        id="password"
        label="Password (min 8 characters)"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={8}
      />
      {error && (
        <p role="alert" style={{ color: "var(--misconception)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn-flag" disabled={busy} style={{ justifyContent: "center" }}>
        {busy ? "Creating…" : "Create account →"}
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
  required = true,
  minLength,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
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
        required={required}
        minLength={minLength}
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
