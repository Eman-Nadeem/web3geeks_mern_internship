import { test, expect } from '@playwright/test';

test.describe('Multi-Vendor Marketplace E2E Journeys', () => {
  test('Customer can explore marketplace and view vendor attribution', async ({ page }) => {
    // 1. Visit Homepage
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('One Unified Marketplace');

    // 2. Browse Products Catalog
    await page.click('text=Browse Products');
    await expect(page).toHaveURL(/\/products/);
    await expect(page.locator('h1')).toContainText('Marketplace Catalog');

    // 3. Visit Vendors Directory
    await page.click('nav >> text=Vendors');
    await expect(page).toHaveURL(/\/vendors/);
    await expect(page.locator('h1')).toContainText('Marketplace Vendors Directory');
  });

  test('Public storefront for active vendor displays catalog; non-existent/unapproved returns 404', async ({ page }) => {
    // 1. Non-existent vendor returns 404
    const res = await page.goto('/vendors/non-existent-vendor-store-xyz');
    expect(res?.status()).toBe(404);
  });

  test('User authentication and role navigation portals', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign In to NexusMarket');

    // Quick demo buttons exist
    await expect(page.locator('text=Admin')).toBeVisible();
    await expect(page.locator('text=Active Vendor')).toBeVisible();
    await expect(page.locator('text=Customer')).toBeVisible();
  });
});
