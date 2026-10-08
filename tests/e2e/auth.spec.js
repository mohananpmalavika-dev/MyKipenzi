import { test, expect } from '@playwright/test';

test('a new person can create an account and arrive at the chat workspace', async ({ page }) => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();

  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Your name').fill('Playwright User');
  await page.getByLabel('Unique handle').fill(`pw_${suffix}`);
  await page.getByLabel('Email address').fill(`pw_${suffix}@example.test`);
  await page.getByLabel('Password').fill('a long strong password');
  await page.getByLabel(/Enable AI translation/).check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('A little closer,', { exact: false })).toBeVisible();
  await expect(page.getByText(`@pw_${suffix}`)).toBeVisible();
});
