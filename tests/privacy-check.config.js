import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'ultimate-privacy.spec.js',
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  outputDir: '../artifacts/privacy-e2e',
  reporter: 'list',
  use: { baseURL: process.env.PRIVACY_TEST_URL || 'http://127.0.0.1:5197', headless: true, screenshot: 'only-on-failure' },
});
