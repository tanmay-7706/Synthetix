import { test, expect } from "@playwright/test";

test.describe("API Access Control & IDOR Defense (E2E)", () => {
  test("GET /api/versions rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/versions?workspaceId=test_ws_id");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Unauthorized");
  });

  test("GET /api/versions rejects unauthenticated request without workspaceId", async ({ request }) => {
    const res = await request.get("/api/versions");
    // Next.js middleware / auth check rejects at edge with 401
    expect(res.status()).toBe(401);
  });

  test("POST /api/liveblocks-auth rejects unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/liveblocks-auth", {
      data: { room: "workspace-unowned_id" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/heal rejects unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/heal", {
      data: {
        error: "TypeError: Cannot read properties of undefined",
        code: "export default function App() {}",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/deploy rejects unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/deploy", {
      data: {
        name: "test-app",
        files: { "/App.js": { code: "console.log(1);" } },
      },
    });
    expect(res.status()).toBe(401);
  });

  test("Component Library APIs reject unauthenticated requests", async ({ request }) => {
    const getRes = await request.get("/api/components");
    expect(getRes.status()).toBe(401);

    const postRes = await request.post("/api/components", {
      data: { name: "Card", code: "<div />", tags: ["ui"] },
    });
    expect(postRes.status()).toBe(401);

    const deleteRes = await request.delete("/api/components?id=comp_123");
    expect(deleteRes.status()).toBe(401);
  });

  test("GET /api/admin/stats rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/admin/stats");
    expect(res.status()).toBe(401);
  });
});

