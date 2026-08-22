import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { applyAnswer } from "@/lib/mastery";

const schema = z.object({
  enrollmentId: z.string().min(1),
  conceptExternalId: z.string().min(1),
  correct: z.boolean(),
  confidence: z.number().min(0).max(1).default(0.5),
  latencyMs: z.number().int().min(0).max(600_000).default(0),
  answerChanges: z.number().int().min(0).max(50).default(0),
  attempts: z.number().int().min(1).max(50).default(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const owns = await prisma.enrollment.findFirst({
    where: { id: parsed.data.enrollmentId, userId: session.user.id },
    select: { id: true },
  });
  if (!owns) return NextResponse.json({ error: "Enrolment not found." }, { status: 404 });

  const result = await applyAnswer({ ...parsed.data, type: "quiz" });
  return NextResponse.json(result);
}
