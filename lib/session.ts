import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Server-side guard for protected pages/actions. Redirects to sign-in if absent. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user;
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}
