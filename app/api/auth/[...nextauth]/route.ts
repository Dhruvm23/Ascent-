import { handlers } from "@/auth";

// Credential check uses bcrypt + Prisma, so this must run on the Node runtime.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
