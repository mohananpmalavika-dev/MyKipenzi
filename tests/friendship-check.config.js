import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'friendship-ui.spec.js',
  workers: 1,
  timeout: 30000,
  outputDir: '../artifacts/friendship-e2e/results',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5192', headless: true, screenshot: 'only-on-failure', serviceWorkers: 'block' },
  webServer: {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5192 --strictPort',
    url: 'http://127.0.0.1:5192', reuseExistingServer: true, timeout: 60000,
  },
});
