import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { parseBody, enforceRateLimit } from "@/lib/http";
import { loadActiveEnrollment } from "@/lib/enrollment";
import { streamExplanation } from "@/lib/ai/agents/tutor";
import { staticExplanation } from "@/lib/ai/fallback";

export const runtime = "nodejs";

const schema = z.object({ conceptExternalId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforceRateLimit(req, "explain", 20, 60_000);
  if (limited) return limited;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const state = await loadActiveEnrollment(session.user.id);
  if (!state) return NextResponse.json({ error: "No active enrolment." }, { status: 404 });

  const concept = state.nodes.find((n) => n.id === parsed.data.conceptExternalId);
  if (!concept) return NextResponse.json({ error: "Concept not found." }, { status: 404 });

  const pKnown = state.masteryMap.get(concept.id)?.pKnown ?? 0.2;
  const tutorArgs = {
    conceptName: concept.name,
    conceptDescription: concept.description ?? "",
    interests: state.interests,
    mode: state.mode,
    pKnown,
    userId: session.user.id,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamExplanation(tutorArgs)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        // Graceful degradation: emit a static, subject-agnostic explanation.
        controller.enqueue(encoder.encode(staticExplanation(tutorArgs)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
