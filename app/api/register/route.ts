import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { parseBody, enforceRateLimit } from "@/lib/http";

const schema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "register", 5, 60_000);
  if (limited) return limited;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  await prisma.user.create({
    data: {
      email,
      name: name?.trim() || null,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  return NextResponse.json({ ok: true });
}
