import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'moods.spec.js',
  workers: 1,
  timeout: 30000,
  outputDir: '../test-results/mood-e2e',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5187', headless: true, screenshot: 'only-on-failure' },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187', reuseExistingServer: false, timeout: 60000,
  },
});
