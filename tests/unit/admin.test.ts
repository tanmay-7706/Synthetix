import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database
vi.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/prisma";

describe("lib/admin - isAdmin", () => {
  const originalEnv = process.env.ADMIN_CLERK_ID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.ADMIN_CLERK_ID = originalEnv;
  });

  it("returns false if clerkId is null, undefined, or empty", async () => {
    process.env.ADMIN_CLERK_ID = "admin_123";
    expect(await isAdmin(null)).toBe(false);
    expect(await isAdmin(undefined)).toBe(false);
    expect(await isAdmin("")).toBe(false);
  });

  it("returns false if ADMIN_CLERK_ID is not configured", async () => {
    delete process.env.ADMIN_CLERK_ID;
    expect(await isAdmin("user_123")).toBe(false);
  });

  it("returns true for exact configured admin Clerk ID", async () => {
    process.env.ADMIN_CLERK_ID = "admin_clerk_id_999";
    expect(await isAdmin("admin_clerk_id_999")).toBe(true);
    expect(await isAdmin("other_user_456")).toBe(false);
  });

  it("handles auto mode: returns true if caller is the first registered user", async () => {
    process.env.ADMIN_CLERK_ID = "auto";
    vi.mocked(db.user.findFirst).mockResolvedValueOnce({ clerkId: "first_user_1" } as any);

    expect(await isAdmin("first_user_1")).toBe(true);
    expect(db.user.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: "asc" },
      select: { clerkId: true },
    });
  });

  it("handles auto mode: returns false if caller is not the first registered user", async () => {
    process.env.ADMIN_CLERK_ID = "auto";
    vi.mocked(db.user.findFirst).mockResolvedValueOnce({ clerkId: "first_user_1" } as any);

    expect(await isAdmin("second_user_2")).toBe(false);
  });

  it("handles auto mode: safely returns false if database query throws", async () => {
    process.env.ADMIN_CLERK_ID = "auto";
    vi.mocked(db.user.findFirst).mockRejectedValueOnce(new Error("Database connection failure"));

    // Must not throw or leak errors
    const result = await isAdmin("user_123");
    expect(result).toBe(false);
  });
});

