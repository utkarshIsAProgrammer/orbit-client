import { test, expect } from '@playwright/test';

test.describe('Orbit App — basic smoke tests', () => {
  test('homepage loads and displays the app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('login page renders the login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for at least one input to appear (email, password, or submit)
    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('signup page renders with input fields', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('forgot password page loads with form inputs', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated profile page redirects to login', async ({ page }) => {
    await page.goto('/profile/testuser');
    await page.waitForLoadState('networkidle');

    // Protected routes should redirect — wait for URL to stabilize
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    // Either already on /login, or the path contains /login
    expect(currentUrl.includes('/login')).toBeTruthy();
  });

  test('search page loads with search input', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });
  });
});
