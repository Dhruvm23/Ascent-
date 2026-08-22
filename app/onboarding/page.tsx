import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { OnboardingWizard } from "./onboarding-wizard";
import type { PresentationMode } from "@/lib/constants";

export const metadata = { title: "Plot your route — Ascent" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const sessionUser = await requireUser();
  const { subject } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });

  return (
    <main id="main" style={{ minHeight: "100dvh", padding: "2.5rem 1.25rem" }}>
      <div style={{ width: "min(100%, 44rem)", margin: "0 auto" }}>
        <OnboardingWizard
          initialSubject={subject ?? ""}
          initialInterests={user?.interests ?? []}
          initialMode={(user?.presentationMode as PresentationMode) ?? "focus"}
        />
      </div>
    </main>
  );
}
