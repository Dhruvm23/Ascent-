import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/site/app-nav";

export const metadata = { title: "Agent efficiency logs — Ascent" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  ok: "var(--valley)",
  fallback: "var(--ridge)",
  cached: "var(--summit)",
  degraded: "var(--slate)",
  error: "var(--misconception)",
};

export default async function DevLogsPage() {
  await requireUser();
  const logs = await prisma.agentLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  const total = logs.length;
  const cacheHits = logs.filter((l) => l.cached || l.status === "cached").length;
  const fallbacks = logs.filter((l) => l.status === "fallback").length;
  const errors = logs.filter((l) => l.status === "error" || l.status === "degraded").length;
  const live = logs.filter((l) => !l.cached && l.latencyMs > 0);
  const avgLatency = live.length ? Math.round(live.reduce((s, l) => s + l.latencyMs, 0) / live.length) : 0;
  const totalTokens = logs.reduce((s, l) => s + (l.promptTokens ?? 0) + (l.completionTokens ?? 0), 0);

  const modelCounts = new Map<string, number>();
  for (const l of logs) {
    const m = l.modelServed ?? "—";
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
  }

  return (
    <>
      <AppNav />
      <main id="main" className="container-map" style={{ padding: "2rem 0 4rem" }}>
        <p className="eyebrow">Efficiency · agent telemetry</p>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.35rem" }}>Every model call, logged</h1>
        <p style={{ color: "var(--muted)", maxWidth: "44rem", marginTop: "0.5rem" }}>
          Which model actually served each response, how many fallbacks were needed, cache hits,
          latency, and token estimates — the resilience of the fallback chain, made visible.
        </p>

        <div style={{ display: "grid", gap: "1px", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", marginTop: "1.5rem", background: "var(--basalt)", border: "1.5px solid var(--basalt)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <Stat label="Total calls" value={String(total)} />
          <Stat label="Cache hits" value={`${cacheHits} (${pct(cacheHits, total)}%)`} />
          <Stat label="Fallbacks" value={String(fallbacks)} />
          <Stat label="Errors" value={String(errors)} />
          <Stat label="Avg latency" value={`${avgLatency}ms`} />
          <Stat label="Est. tokens" value={totalTokens.toLocaleString()} />
        </div>

        {modelCounts.size > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {[...modelCounts.entries()].map(([m, c]) => (
              <span key={m} className="data" style={{ fontSize: "var(--text-xs)", border: "1.5px solid var(--basalt)", borderRadius: "var(--radius)", padding: "0.25rem 0.6rem", background: "var(--vellum-inset)" }}>
                {m} · {c}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: "1.5rem", overflowX: "auto", border: "1.5px solid var(--basalt)", borderRadius: "var(--radius-lg)" }}>
          <table className="data" style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)", minWidth: "48rem" }}>
            <caption className="sr-only">Recent agent model calls</caption>
            <thead>
              <tr style={{ background: "var(--vellum-deep)", textAlign: "left" }}>
                <Th>When</Th>
                <Th>Agent</Th>
                <Th>Task</Th>
                <Th>Model served</Th>
                <Th>Attempts</Th>
                <Th>Latency</Th>
                <Th>Tokens</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
                    No calls logged yet. Go through a lesson to populate this.
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--contour)" }}>
                  <Td>{new Date(l.createdAt).toLocaleString()}</Td>
                  <Td>{l.agent}</Td>
                  <Td>{l.taskType}</Td>
                  <Td>{l.modelServed ?? "—"}</Td>
                  <Td>{l.attempts}</Td>
                  <Td>{l.cached ? "cache" : `${l.latencyMs}ms`}</Td>
                  <Td>{(l.promptTokens ?? 0) + (l.completionTokens ?? 0)}</Td>
                  <Td>
                    <span style={{ color: STATUS_TONE[l.status] ?? "var(--fg)", fontWeight: 700 }}>{l.status}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--vellum-inset)", padding: "1rem 1.2rem" }}>
      <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{value}</div>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "0.6rem 0.8rem", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "0.55rem 0.8rem", whiteSpace: "nowrap" }}>{children}</td>;
}
function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0;
}
