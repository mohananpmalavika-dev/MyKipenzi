import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', testMatch: 'sticker-maker.spec.js', timeout: 30000, workers: 1,
  use: { baseURL: 'http://localhost:5183', headless: true },
  webServer: { cwd: process.cwd(), command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort', url: 'http://localhost:5183', reuseExistingServer: true } });
