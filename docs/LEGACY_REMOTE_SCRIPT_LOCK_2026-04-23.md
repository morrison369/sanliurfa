# Legacy Remote Script Lock

Date: 2026-04-23

This repository is locked to the active CWP/Astro runtime in `docs/ACTIVE_DEPLOYMENT_CWP_4321.md`.

## Decision

Legacy remote operation scripts are disabled when they can:

- SSH to production directly.
- Write `.env.production`.
- Change Apache/CWP virtual hosts.
- Change PostgreSQL authentication or create ad-hoc database schema.
- Start PM2 or Node on old ports such as `3000` or `6000`.
- Upload debug scripts to production.
- Install cron, backup, monitoring, SSL, or other host-level services outside the approved deployment path.

## Active Path

Use only:

```bash
npm install --legacy-peer-deps
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

The only application port is `4321`.

## Reason

The old scripts repeatedly reintroduced conflicting ports, direct server mutations, stale credentials, and non-Astro deployment paths. Keeping them as executable legacy tools makes the project unstable and causes repeated regressions.

## Scope

Content/image fetching scripts and phase/test scripts are not part of this lock unless they perform remote production mutation.
