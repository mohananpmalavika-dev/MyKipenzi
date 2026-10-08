import { spawn } from 'node:child_process';

const commands = [
  ['--watch', 'server/index.js'],
  ['--watch', 'server/worker.js'],
  ['./node_modules/vite/bin/vite.js', '--host', '0.0.0.0'],
];

const children = commands.map((args) => spawn(process.execPath, args, { stdio: 'inherit' }));

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
