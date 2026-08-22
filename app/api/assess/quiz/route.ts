import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseBody, enforceRateLimit } from "@/lib/http";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { generateQuiz } from "@/lib/ai/agents/assessor";
import { staticQuizItem } from "@/lib/ai/fallback";

const schema = z.object({
  conceptExternalId: z.string().min(1),
  count: z.number().int().min(1).max(4).default(2),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(req, "quiz", 20, 60_000);
  if (limited) return limited;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const state = await loadActiveEnrollment(session.user.id);
  if (!state) return NextResponse.json({ error: "No active enrolment." }, { status: 404 });

  const concept = state.nodes.find((n) => n.id === parsed.data.conceptExternalId);
  if (!concept) return NextResponse.json({ error: "Concept not found." }, { status: 404 });

  // 1. Try the Assessor agent.
  try {
    const quiz = await generateQuiz({
      conceptName: concept.name,
      conceptDescription: concept.description ?? "",
      mode: state.mode,
      count: parsed.data.count,
      userId: session.user.id,
    });
    return NextResponse.json({ items: quiz.items, source: "live" });
  } catch {
    // 2. Fall back to any stored MCQ/diagnostic items for this concept.
    const dbId = state.conceptDbIds.get(concept.id);
    if (dbId) {
      const stored = await prisma.quizItem.findMany({
        where: { conceptId: dbId, kind: { in: ["mcq", "diagnostic"] } },
        take: parsed.data.count,
      });
      if (stored.length) {
        return NextResponse.json({
          items: stored.map((s) => ({
            stem: s.stem,
            choices: s.choices,
            answerId: s.answer,
            explanation: undefined,
          })),
          source: "cache",
        });
      }
    }
    // 3. Deterministic static item.
    return NextResponse.json({
      items: [staticQuizItem(concept.name, concept.description ?? "")],
      source: "static",
    });
  }
}
