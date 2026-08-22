import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseBody, enforceRateLimit } from "@/lib/http";
import { enrollUser } from "@/lib/enrollment";
import { PRESENTATION_MODES } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  subject: z.string().min(2).max(120),
  goal: z.string().max(300).optional(),
  targetWeeks: z.number().int().min(1).max(52).default(6),
  interests: z.array(z.string().max(40)).max(5).default([]),
  mode: z.enum(PRESENTATION_MODES).default("focus"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(req, "enroll", 10, 60_000);
  if (limited) return limited;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { subject, goal, targetWeeks, interests, mode } = parsed.data;

  try {
    const { enrollmentId, courseId, source } = await enrollUser({
      userId: session.user.id,
      subject,
      goalText: goal,
      targetWeeks,
      interests,
      mode,
    });

    // Return diagnostic items for the client-side adaptive pretest.
    const items = await prisma.quizItem.findMany({
      where: { courseId, kind: "diagnostic" },
      include: { concept: { select: { externalId: true, difficultyTier: true } } },
    });

    return NextResponse.json({
      enrollmentId,
      courseId,
      source,
      diagnostics: items.map((i) => ({
        id: i.id,
        conceptExternalId: i.concept.externalId,
        difficulty: i.difficulty,
        stem: i.stem,
        choices: i.choices,
        answerId: i.answer,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrolment failed.";
    console.error("[enroll]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
