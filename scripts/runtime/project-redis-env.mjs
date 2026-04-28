import path from 'node:path';

const KNOWN_WORKTREE_PORTS = new Map([
  ['sanliurfa', 6381],
  ['public-worktree-sync', 6382],
]);

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function resolveProjectRedisPort(root, env = process.env) {
  const explicit = env.PROJECT_REDIS_PORT || env.REDIS_PORT;
  if (explicit) {
    const port = Number(explicit);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(`Invalid Redis port: ${explicit}`);
    }
    return port;
  }

  const basename = path.basename(root);
  const known = KNOWN_WORKTREE_PORTS.get(basename);
  if (known) return known;

  return 6383 + (hashString(path.resolve(root).toLowerCase()) % 17);
}

export function resolveProjectRedisUrl(root, env = process.env) {
  if (env.PROJECT_REDIS_URL) return env.PROJECT_REDIS_URL;

  const port = resolveProjectRedisPort(root, env);
  const password = env.PROJECT_REDIS_PASSWORD || env.REDIS_PASSWORD || '';
  if (password) {
    return `redis://:${encodeURIComponent(password)}@127.0.0.1:${port}`;
  }
  return `redis://127.0.0.1:${port}`;
}

export function resolveProjectRedisEnv(root, env = process.env) {
  const port = resolveProjectRedisPort(root, env);
  const url = resolveProjectRedisUrl(root, env);
  return {
    PROJECT_REDIS_PORT: String(port),
    PROJECT_REDIS_URL: url,
    REDIS_PORT: String(port),
    REDIS_URL: url,
  };
}
