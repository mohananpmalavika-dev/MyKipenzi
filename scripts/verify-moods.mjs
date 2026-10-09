import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  root, server: { host: '127.0.0.1', port: 5196, strictPort: false },
});
try {
  await server.listen();
  const address = server.httpServer.address();
  const child = spawn(process.execPath, [
    'node_modules/@playwright/test/cli.js', 'test', '--config', 'tests/mood-check.config.js',
  ], {
    cwd: root, windowsHide: true, stdio: 'inherit',
    env: { ...process.env, MOOD_TEST_URL: `http://127.0.0.1:${address.port}` },
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
} finally {
  await server.close();
}
