import { Client } from 'pg';

function parseDbNameFromUrl(connectionString: string): string {
  const parsed = new URL(connectionString);
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName) {
    throw new Error('DATABASE_URL içinde veritabanı adı bulunamadı');
  }
  return dbName;
}

function buildAdminUrl(connectionString: string): string {
  const parsed = new URL(connectionString);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

async function canConnect(connectionString: string): Promise<boolean> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('db-test-bootstrap: DATABASE_URL gerekli');
  }

  const targetDb = parseDbNameFromUrl(databaseUrl);

  if (await canConnect(databaseUrl)) {
    console.log(`db-test-bootstrap: OK (reachable=${targetDb})`);
    return;
  }

  const adminUrl = buildAdminUrl(databaseUrl);
  const client = new Client({ connectionString: adminUrl });

  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (exists.rowCount && exists.rowCount > 0) {
      console.log(`db-test-bootstrap: OK (exists=${targetDb})`);
      return;
    }

    await client.query(`CREATE DATABASE "${targetDb.replace(/"/g, '""')}"`);
    console.log(`db-test-bootstrap: created (${targetDb})`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`db-test-bootstrap: FAIL (${error instanceof Error ? error.message : String(error)})`);
  process.exit(1);
});
