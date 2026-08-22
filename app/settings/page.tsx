import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AppNav } from "@/components/site/app-nav";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings — Ascent" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });

  return (
    <>
      <AppNav />
      <main id="main" className="container-map" style={{ padding: "2rem 0 4rem", maxWidth: "48rem" }}>
        <p className="eyebrow">Settings</p>
        <h1 style={{ fontSize: "var(--text-2xl)", marginTop: "0.35rem" }}>Tune your climb</h1>
        <SettingsClient interests={user?.interests ?? []} />
      </main>
    </>
  );
}
