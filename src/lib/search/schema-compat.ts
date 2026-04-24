import { queryMany } from '../postgres';

const columnCache = new Map<string, boolean>();

function cacheKey(table: string, column: string): string {
  return `${table}.${column}`;
}

export async function hasColumn(table: string, column: string): Promise<boolean> {
  const key = cacheKey(table, column);
  if (columnCache.has(key)) {
    return columnCache.get(key) === true;
  }

  try {
    const rows = await queryMany<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
      `,
      [table, column],
    );
    const exists = rows[0]?.exists === true;
    columnCache.set(key, exists);
    return exists;
  } catch {
    columnCache.set(key, false);
    return false;
  }
}

export async function pickFirstExistingColumn(
  table: string,
  columns: string[],
): Promise<string | null> {
  for (const column of columns) {
    if (await hasColumn(table, column)) {
      return column;
    }
  }
  return null;
}

