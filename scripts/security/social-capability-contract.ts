import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

const requiredPaths = [
  'src/pages/api/auth/login.ts',
  'src/pages/api/auth/register.ts',
  'src/pages/api/auth/logout.ts',
  'src/pages/api/social/follows.ts',
  'src/pages/api/social/feed.ts',
  'src/pages/api/social/swipe/index.ts',
  'src/pages/api/social/swipe/candidates.ts',
  'src/pages/api/social/swipe/matches.ts',
  'src/pages/api/social/swipe/unmatch.ts',
  'src/pages/api/messages/index.ts',
  'src/pages/api/messages/[conversationId].ts',
  'src/pages/sosyal/eslesme.astro',
  'src/pages/sosyal/index.astro',
  'src/pages/mesajlar/index.astro',
];

for (const relativePath of requiredPaths) {
  const absolutePath = join(root, ...relativePath.split('/'));
  if (!existsSync(absolutePath)) {
    blockers.push(`missing social capability file: ${relativePath}`);
  }
}

if (blockers.length > 0) {
  console.error('[social-capability] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[social-capability] ok: auth/social/messaging capability surface is present');
