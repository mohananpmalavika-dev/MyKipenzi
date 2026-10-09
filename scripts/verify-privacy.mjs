import { build, preview } from 'vite';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// Test a stable production bundle while other workspace edits may be in progress.
await build({ root });
const server = await preview({ root, preview: { host: '127.0.0.1', port: 5197, strictPort: false } });
try {
  const address = server.httpServer.address();
  const child = spawn(process.execPath, [
    'node_modules/@playwright/test/cli.js', 'test', '--config', 'tests/privacy-check.config.js',
  ], { cwd: root, windowsHide: true, stdio: 'inherit', env: { ...process.env, PRIVACY_TEST_URL: `http://127.0.0.1:${address.port}` } });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject); child.once('exit', code => resolve(code ?? 1));
  });
} finally { await new Promise(resolve => server.httpServer.close(resolve)); }
