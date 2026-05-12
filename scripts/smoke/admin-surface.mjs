import { spawnSync } from 'node:child_process';

const commands = [
  ['npm', ['run', '-s', 'smoke:admin:quick-nav']],
  ['npm', ['run', '-s', 'smoke:admin:preset-surface']],
];

console.log('admin surface smoke');

for (const [cmd, args] of commands) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('OK: admin surface smoke passed');
