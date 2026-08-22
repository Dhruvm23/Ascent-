import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, create } = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique, create } } }));

import { POST } from "@/app/api/register/route";

function req(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/register", () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
  });

  it("creates a new account with a hashed password", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1" });

    const res = await POST(req({ email: "new@test.dev", password: "supersecret", name: "New" }, "10.0.0.1"));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0][0];
    // Password must be hashed, never stored in plaintext.
    expect(arg.data.passwordHash).toBeTypeOf("string");
    expect(arg.data.passwordHash).not.toBe("supersecret");
  });

  it("rejects invalid input with 400", async () => {
    const res = await POST(req({ email: "not-an-email", password: "short" }, "10.0.0.2"));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 409 when the email already exists", async () => {
    findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(req({ email: "dupe@test.dev", password: "supersecret" }, "10.0.0.3"));
    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("rate-limits repeated requests from the same client", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u" });
    const ip = "10.0.0.99";
    let last = 200;
    for (let i = 0; i < 7; i++) {
      const res = await POST(req({ email: `a${i}@test.dev`, password: "supersecret" }, ip));
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
