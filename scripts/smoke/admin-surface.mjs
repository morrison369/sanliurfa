import { spawnSync } from 'node:child_process';

const verbose = process.env.ADMIN_SURFACE_VERBOSE !== '0';

const commands = [
  ['npm', ['run', '-s', 'smoke:admin:quick-nav']],
  ['npm', ['run', '-s', 'smoke:admin:preset-surface']],
];

if (verbose) {
  console.log('admin surface smoke');
}

for (const [cmd, args] of commands) {
  if (verbose) {
    console.log(`> ${cmd} ${args.join(' ')}`);
  }
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(verbose ? 'OK: admin surface smoke passed' : 'admin-surface-smoke: PASS');
