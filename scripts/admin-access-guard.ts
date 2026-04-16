import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ADMIN_API_ROOT = resolve(process.cwd(), 'src', 'pages', 'api', 'admin');
const ROUTE_EXPORT_PATTERN = /export const (GET|POST|PUT|DELETE|PATCH): APIRoute/g;
const ROUTE_EXPORT_DETECT_PATTERN = /export const (GET|POST|PUT|DELETE|PATCH): APIRoute/;
const WRAPPER_PATTERN = /withAdminOps(Read|Write)Access\s*\(/g;

function walk(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith('.ts')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toRelativePath(absolutePath: string): string {
  return absolutePath.replace(process.cwd(), '').replace(/^[\\/]+/, '').replace(/\\/g, '/');
}

function countMatches(source: string, pattern: RegExp): number {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

function main(): void {
  if (!statSync(ADMIN_API_ROOT).isDirectory()) {
    throw new Error(`admin-access-guard: admin api root missing at ${ADMIN_API_ROOT}`);
  }

  const adminRouteFiles = walk(ADMIN_API_ROOT);
  const routeFiles = adminRouteFiles.filter((filePath) => {
    const source = readFileSync(filePath, 'utf8');
    return ROUTE_EXPORT_DETECT_PATTERN.test(source);
  });

  const driftedFiles = routeFiles.filter((filePath) => {
    const source = readFileSync(filePath, 'utf8');
    const routeCount = countMatches(source, ROUTE_EXPORT_PATTERN);
    const wrapperCount = countMatches(source, WRAPPER_PATTERN);
    return wrapperCount < routeCount;
  });

  if (driftedFiles.length > 0) {
    throw new Error(
      `admin-access-guard: wrapper drift detected (${driftedFiles
        .map((filePath) => toRelativePath(filePath))
        .join(', ')})`
    );
  }

  console.log(
    `admin-access-guard: OK (route_files=${routeFiles.length}, wrapper_files=${routeFiles.length})`
  );
}

main();
