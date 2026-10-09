import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'sticker-maker.spec.js',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://localhost:5184', headless: true },
  webServer: {
    cwd: process.cwd(),
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5184 --strictPort',
    url: 'http://localhost:5184',
    reuseExistingServer: true,
  },
});
