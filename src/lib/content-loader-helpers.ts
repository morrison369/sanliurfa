import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function hasMatchingMarkdownFiles(baseDir: string): boolean {
  if (!existsSync(baseDir)) {
    return false;
  }

  const queue = [baseDir];
  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir) {
      continue;
    }

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        queue.push(resolve(currentDir, entry.name));
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        return true;
      }
    }
  }

  return false;
}
