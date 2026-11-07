import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock Prisma db
vi.mock("@/lib/prisma", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Liveblocks Node SDK
const mockPrepareSession = vi.fn();
const mockAllow = vi.fn();
const mockAuthorize = vi.fn();

vi.mock("@liveblocks/node", () => {
  return {
    Liveblocks: class MockLiveblocks {
      prepareSession(...args: any[]) {
        mockPrepareSession(...args);
        return {
          allow: mockAllow,
          FULL_ACCESS: ["*"],
          authorize: mockAuthorize,
        };
      }
    },
  };
});

import { POST } from "@/app/api/liveblocks-auth/route";
import { db } from "@/lib/prisma";

describe("POST /api/liveblocks-auth - Authorization Logic", () => {
  const originalSecret = process.env.LIVEBLOCKS_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_fake_secret_key_123456789";
  });

  afterEach(() => {
    process.env.LIVEBLOCKS_SECRET_KEY = originalSecret;
  });

  it("returns 503 when Liveblocks secret key is missing", async () => {
    delete process.env.LIVEBLOCKS_SECRET_KEY;

    const req = new Request("http://localhost:3000/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: "workspace-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.message).toContain("Multiplayer not configured");
  });

  it("returns 401 when request is unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const req = new Request("http://localhost:3000/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: "workspace-123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("returns 400 when room parameter is missing", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "user_clerk_1" });

    const req = new Request("http://localhost:3000/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Missing room");
  });

  it("returns 403 when user attempts to access an unowned workspace room", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "attacker_clerk_id" });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: "attacker_db_id",
      name: "Attacker",
      email: "attacker@test.com",
      imageUrl: "",
    } as any);

    // Workspace ownership lookup returns null
    vi.mocked(db.workspace.findUnique).mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: "workspace-target_ws_99" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("Access denied to this workspace");

    // Liveblocks session should never be prepared or authorized
    expect(mockPrepareSession).not.toHaveBeenCalled();
    expect(mockAllow).not.toHaveBeenCalled();
  });

  it("authorizes access (200) when user owns the requested workspace room", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "owner_clerk_id" });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({
      id: "owner_db_id",
      name: "Alice Owner",
      email: "alice@test.com",
      imageUrl: "https://example.com/avatar.png",
    } as any);

    vi.mocked(db.workspace.findUnique).mockResolvedValueOnce({
      id: "target_ws_99",
    } as any);

    mockAuthorize.mockResolvedValueOnce({
      body: JSON.stringify({ token: "liveblocks_jwt_token" }),
      status: 200,
    });

    const req = new Request("http://localhost:3000/api/liveblocks-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: "workspace-target_ws_99" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify session was prepared with owner metadata and room permission granted
    expect(mockPrepareSession).toHaveBeenCalledWith("user-owner_db_id", {
      userInfo: expect.objectContaining({
        name: "Alice Owner",
        avatar: "https://example.com/avatar.png",
      }),
    });
    expect(mockAllow).toHaveBeenCalledWith("workspace-target_ws_99", expect.anything());
  });
});
