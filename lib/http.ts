import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey } from "./rate-limit";

/** Parse + validate a JSON body against a Zod schema, or return a 400 Response. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed.", issues: result.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { data: result.data };
}

/** Apply a rate limit; returns a 429 Response if exceeded, else null. */
export function enforceRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  const result = rateLimit(clientKey(req, bucket), limit, windowMs);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) },
      },
    );
  }
  return null;
}
