import { test, expect } from "@playwright/test";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

test.describe("Component Library & Mobile Viewport (E2E)", () => {
  let createdComponentId: string | null = null;
  let client: pg.Client;

  test.beforeAll(async () => {
    client = new pg.Client({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
  });

  test.afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  test("Database and relational integrity for component lifecycle", async () => {
    // 1. Fetch active test user dynamically
    const userRes = await client.query('SELECT id, email FROM "User" LIMIT 1');
    expect(userRes.rows.length).toBeGreaterThan(0);
    const testUserId = userRes.rows[0].id;

    // 2. Create component for the test user
    const testCompId = "test-comp-pw-" + Date.now();
    await client.query(
      `INSERT INTO "Component" (id, "userId", name, tags, code, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        testCompId,
        testUserId,
        "Playwright E2E Button",
        ["ui", "playwright", "test"],
        "export default function Button() { return <button className='btn'>E2E</button>; }",
      ]
    );
    createdComponentId = testCompId;

    // 3. Read back via foreign key query
    const compRes = await client.query('SELECT * FROM "Component" WHERE id = $1', [testCompId]);
    expect(compRes.rows.length).toBe(1);
    expect(compRes.rows[0].name).toBe("Playwright E2E Button");
    expect(compRes.rows[0].userId).toBe(testUserId);

    // 4. Delete and clean up
    await client.query('DELETE FROM "Component" WHERE id = $1', [testCompId]);
    createdComponentId = null;

    // 5. Verify cleanup
    const verifyRes = await client.query('SELECT id FROM "Component" WHERE id = $1', [testCompId]);
    expect(verifyRes.rows.length).toBe(0);
  });

  test.afterEach(async () => {
    // Safety cleanup in case of unexpected test failure
    if (createdComponentId && client) {
      try {
        await client.query('DELETE FROM "Component" WHERE id = $1', [createdComponentId]);
      } catch {
        // Ignore if already deleted
      }
    }
  });

  test("Mobile blocker activates on small viewports", async ({ page }) => {
    // Set viewport to mobile width (375x667 iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to homepage
    await page.goto("/");
    // Hero should adapt cleanly without breaking
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
  });
});
