import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { abilityToPrior } from "@/lib/engine/diagnostic";
import { bktUpdate, paramsForDifficulty } from "@/lib/engine/bkt";

const schema = z.object({
  enrollmentId: z.string().min(1),
  finalTheta: z.number().min(-4).max(4),
  responses: z
    .array(z.object({ conceptExternalId: z.string(), correct: z.boolean() }))
    .max(40)
    .default([]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { enrollmentId, finalTheta, responses } = parsed.data;

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, userId: session.user.id },
  });
  if (!enrollment) return NextResponse.json({ error: "Enrolment not found." }, { status: 404 });

  const concepts = await prisma.concept.findMany({ where: { courseId: enrollment.courseId } });
  const byExternal = new Map(concepts.map((c) => [c.externalId, c]));

  // Seed each concept's prior from the ability estimate + its difficulty.
  for (const c of concepts) {
    let pKnown = abilityToPrior(finalTheta, c.difficultyTier);
    // Refine with any actual responses observed for this concept.
    const params = paramsForDifficulty(c.difficultyTier);
    for (const r of responses.filter((r) => r.conceptExternalId === c.externalId)) {
      pKnown = bktUpdate(pKnown, r.correct, params);
    }
    await prisma.masteryState.upsert({
      where: { enrollmentId_conceptId: { enrollmentId, conceptId: c.id } },
      create: { enrollmentId, conceptId: c.id, pKnown },
      update: { pKnown },
    });
  }
  void byExternal;

  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { diagnosticDone: true } });

  return NextResponse.json({ ok: true });
}
