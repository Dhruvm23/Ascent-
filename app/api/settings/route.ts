import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { PRESENTATION_MODES } from "@/lib/constants";

const schema = z.object({
  mode: z.enum(PRESENTATION_MODES).optional(),
  interests: z.array(z.string().max(40)).max(5).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(parsed.data.mode ? { presentationMode: parsed.data.mode } : {}),
      ...(parsed.data.interests ? { interests: parsed.data.interests } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
