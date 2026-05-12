/**
 * Compatibility wrapper for the canonical PostgreSQL gateway.
 *
 * New code must import from `src/lib/postgres.ts`. This module exists only for
 * older imports that still resolve through `src/lib/postgres/postgres.ts`.
 */

export {
  ALLOWED_TABLES,
  getPool,
  getPoolStatus,
  insert,
  pool,
  query,
  queryMany,
  queryOne,
  readReplicaPool,
  transaction,
  update,
  updatePoolStatus,
} from '../postgres';

export { default } from '../postgres';
