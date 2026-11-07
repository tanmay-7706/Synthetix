import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    version: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/versions/route";
import { db } from "@/lib/prisma";

describe("GET /api/versions - Authorization Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 Unauthorized when user is not authenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const req = new NextRequest("http://localhost:3000/api/versions?workspaceId=ws-123");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("returns 400 Bad Request when workspaceId is missing", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "user_clerk_1" });

    const req = new NextRequest("http://localhost:3000/api/versions");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("workspaceId is required");
  });

  it("returns 404 Not Found when authenticated user does not exist in db", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "user_clerk_unknown" });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/versions?workspaceId=ws-123");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("User not found");
  });

  it("returns 404 when user attempts to access an unowned workspace (IDOR protection)", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "attacker_clerk_id" });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: "attacker_db_id" } as any);
    // Workspace lookup with { id: "victim_ws", userId: "attacker_db_id" } returns null
    vi.mocked(db.workspace.findUnique).mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/versions?workspaceId=victim_ws");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Workspace not found");

    // Verify ownership check was strictly enforced
    expect(db.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: "victim_ws", userId: "attacker_db_id" },
      select: { id: true },
    });
  });

  it("returns 200 and version list when workspace is owned by authenticated user", async () => {
    mockAuth.mockResolvedValueOnce({ userId: "owner_clerk_id" });
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ id: "owner_db_id" } as any);
    vi.mocked(db.workspace.findUnique).mockResolvedValueOnce({ id: "owner_ws" } as any);

    const fakeVersions = [
      { id: "v1", label: "Initial Version", createdAt: new Date("2026-01-01") },
      { id: "v2", label: "Updated Header", createdAt: new Date("2026-01-02") },
    ];
    vi.mocked(db.version.findMany).mockResolvedValueOnce(fakeVersions as any);

    const req = new NextRequest("http://localhost:3000/api/versions?workspaceId=owner_ws");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions).toHaveLength(2);
    expect(body.versions[0].id).toBe("v1");
  });
});

