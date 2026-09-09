import { test, expect } from "@playwright/test";
import { prisma } from "../lib/db/prisma";
import { signToken } from "../lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "../lib/auth/session";

test.describe.serial("Multi-User Real-Time Collaboration (3-Browser Scenario)", () => {
  const userA = { id: "user_a_e2e", name: "Alice Wonderland", email: "alice.e2e@example.com" };
  const userB = { id: "user_b_e2e", name: "Bob Builder", email: "bob.e2e@example.com" };
  const userC = { id: "user_c_e2e", name: "Charlie Chaplin", email: "charlie.e2e@example.com" };

  let docId: string;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  test.beforeAll(async () => {
    // 1. Seed users in database
    await prisma.user.upsert({
      where: { id: userA.id },
      update: { name: userA.name, email: userA.email },
      create: { id: userA.id, name: userA.name, email: userA.email, password: "" },
    });
    await prisma.user.upsert({
      where: { id: userB.id },
      update: { name: userB.name, email: userB.email },
      create: { id: userB.id, name: userB.name, email: userB.email, password: "" },
    });
    await prisma.user.upsert({
      where: { id: userC.id },
      update: { name: userC.name, email: userC.email },
      create: { id: userC.id, name: userC.name, email: userC.email, password: "" },
    });

    // 2. Create test document owned by User A with User B & C as collaborators
    const doc = await prisma.document.create({
      data: {
        title: "E2E 3-Browser Collaboration Canvas",
        content: "<p>Initial shared collaborative paragraph for E2E testing.</p>",
        ownerId: userA.id,
        collaborators: {
          create: [
            { userId: userB.id, role: "editor" },
            { userId: userC.id, role: "editor" },
          ],
        },
      },
    });
    docId = doc.id;

    // 3. Generate JWT tokens for each user
    tokenA = await signToken(userA);
    tokenB = await signToken(userB);
    tokenC = await signToken(userC);
  });

  test.afterAll(async () => {
    if (docId) {
      await prisma.document.delete({ where: { id: docId } }).catch(() => null);
    }
  });

  test("3 authenticated browser contexts collaborate: presence, live cursors, LWW resolution, tab close, and resync", async ({
    browser,
  }) => {
    // Step 1: Initialize 3 isolated browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    let contextC = await browser.newContext();

    await contextA.addCookies([{ name: AUTH_COOKIE_NAME, value: tokenA, domain: "localhost", path: "/" }]);
    await contextB.addCookies([{ name: AUTH_COOKIE_NAME, value: tokenB, domain: "localhost", path: "/" }]);
    await contextC.addCookies([{ name: AUTH_COOKIE_NAME, value: tokenC, domain: "localhost", path: "/" }]);

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    let pageC = await contextC.newPage();

    // Step 2: Open the document in Browser A, B, and C simultaneously
    await Promise.all([
      pageA.goto(`/documents/${docId}`),
      pageB.goto(`/documents/${docId}`),
      pageC.goto(`/documents/${docId}`),
    ]);

    // Wait for all three editors to mount
    await expect(pageA.locator(".tiptap")).toBeVisible();
    await expect(pageB.locator(".tiptap")).toBeVisible();
    await expect(pageC.locator(".tiptap")).toBeVisible();

    // Step 3: Verify all three appear in each other's presence list with names
    await expect(pageA.getByText("3 active")).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText("3 active")).toBeVisible({ timeout: 15000 });
    await expect(pageC.getByText("3 active")).toBeVisible({ timeout: 15000 });

    // Step 4: Move cursor in Browser A -> verify remote caret and name badge render in B and C
    await pageA.locator(".tiptap").click();
    await expect(pageB.locator(".collaboration-cursor-caret").getByText("Alice Wonderland")).toBeVisible({ timeout: 10000 });
    await expect(pageC.locator(".collaboration-cursor-caret").getByText("Alice Wonderland")).toBeVisible({ timeout: 10000 });

    // Step 5: Type from A and B -> verify LWW resolution and true convergence across clients
    // 5a. Sequential edit propagation: Type from A, verify B and C reflect it via retry-until-match (no fixed sleeps)
    await pageA.locator(".tiptap").pressSequentially(" [Edit A]");
    await expect(pageB.locator(".tiptap")).toContainText("[Edit A]", { timeout: 10000 });
    await expect(pageC.locator(".tiptap")).toContainText("[Edit A]", { timeout: 10000 });

    // Helper to extract clean document text excluding any live collaborator cursor carets/labels
    const getEditorText = async (page: any): Promise<string> => {
      return page.evaluate(() => {
        const tiptap = document.querySelector(".tiptap");
        if (!tiptap) return "";
        const clone = tiptap.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".collaboration-cursor-caret").forEach((el) => el.remove());
        return clone.innerText.trim();
      });
    };

    // 5b. Genuinely simultaneous edits: Trigger typing concurrently from A and B via Promise.all
    await Promise.all([
      pageA.locator(".tiptap").pressSequentially(" [Simultaneous A]"),
      pageB.locator(".tiptap").pressSequentially(" [Simultaneous B]"),
    ]);

    // Verify TRUE convergence: After simultaneous edits settle, all 3 browsers must have IDENTICAL full text content
    await expect
      .poll(
        async () => {
          const textA = await getEditorText(pageA);
          const textB = await getEditorText(pageB);
          const textC = await getEditorText(pageC);
          return textA === textB && textB === textC && textA.length > 0;
        },
        { timeout: 15000, intervals: [200, 500, 1000] }
      )
      .toBe(true);

    const convergedText = await getEditorText(pageA);
    const textB = await getEditorText(pageB);
    const textC = await getEditorText(pageC);

    expect(convergedText).toBe(textB);
    expect(textB).toBe(textC);

    // Step 6: Close Browser C -> verify User C disappears from A and B's presence list
    await pageC.close();
    await contextC.close();

    // Wait for presence list to update on remaining clients within heartbeat/beacon window
    await expect(pageA.getByText("2 active")).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText("2 active")).toBeVisible({ timeout: 15000 });

    // Step 7: Reconnect Browser C -> verify full sync of current state and presence
    contextC = await browser.newContext();
    await contextC.addCookies([{ name: AUTH_COOKIE_NAME, value: tokenC, domain: "localhost", path: "/" }]);
    pageC = await contextC.newPage();
    await pageC.goto(`/documents/${docId}`);

    await expect(pageC.locator(".tiptap")).toBeVisible();
    // After reconnect, C should sync the exact current converged content
    await expect
      .poll(async () => await getEditorText(pageC), { timeout: 15000 })
      .toBe(convergedText);
    // And all 3 should once again see 3 active collaborators
    await expect(pageA.getByText("3 active")).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText("3 active")).toBeVisible({ timeout: 15000 });
    await expect(pageC.getByText("3 active")).toBeVisible({ timeout: 15000 });

    // Clean up contexts
    await contextA.close();
    await contextB.close();
    await contextC.close();
  });
});
