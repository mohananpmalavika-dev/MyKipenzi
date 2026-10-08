import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
    permissions: ['microphone', 'camera'],
  },
  webServer: [
    {
      command: 'node server/migrate.js && node server/index.js',
      url: 'http://localhost:3001/api/health/ready',
      reuseExistingServer: false,
      timeout: 120000,
      env: { NODE_ENV: 'test', RATE_LIMIT_NAMESPACE: `e2e_${Date.now()}` },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
