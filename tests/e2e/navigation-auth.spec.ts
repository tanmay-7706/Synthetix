import { test, expect } from "@playwright/test";

test.describe("Navigation & Route Protection (E2E)", () => {
  test("Homepage loads successfully and contains primary call-to-action", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Synthetix/i);

    // Verify hero prompt input exists
    const promptInput = page.locator("textarea");
    await expect(promptInput).toBeVisible();

    // Verify primary CTA button exists
    const generateBtn = page.getByRole("button", { name: /generate/i });
    await expect(generateBtn).toBeVisible();
  });

  test("Unauthenticated hero submission saves prompt to sessionStorage", async ({ page }) => {
    await page.goto("/");
    const promptInput = page.locator("textarea");
    await promptInput.fill("Create a modern SaaS pricing table");

    const generateBtn = page.getByRole("button", { name: /generate/i });
    await generateBtn.click();

    // Verify sessionStorage retains the prompt for retrieval post-login
    const savedPrompt = await page.evaluate(() => {
      return sessionStorage.getItem("synthetix_pending_prompt");
    });
    expect(savedPrompt).toBe("Create a modern SaaS pricing table");
  });

  test("Sign-in and sign-up pages load successfully", async ({ page }) => {
    const signInRes = await page.goto("/sign-in");
    expect(signInRes?.status()).toBe(200);

    const signUpRes = await page.goto("/sign-up");
    expect(signUpRes?.status()).toBe(200);
  });

  test("Unauthenticated access to /workspace redirects to sign-in", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page).toHaveURL(/.*sign-in.*/);
  });

  test("Unauthenticated access to /projects redirects to sign-in", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/.*sign-in.*/);
  });

  test("Unauthenticated access to /library redirects to sign-in", async ({ page }) => {
    await page.goto("/library");
    await expect(page).toHaveURL(/.*sign-in.*/);
  });

  test("Unauthenticated access to /admin redirects to sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/.*sign-in.*/);
  });
});

