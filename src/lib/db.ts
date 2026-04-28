import { query } from './postgres';

type ExecuteResult = { rows: any[]; rowCount?: number };

function normalizeSql(input: any): { text: string; params: any[] } {
  if (typeof input === 'string') {
    return { text: input, params: [] };
  }

  if (input && typeof input.sql === 'string') {
    return { text: input.sql, params: Array.isArray(input.params) ? input.params : [] };
  }

  if (input && typeof input.toSQL === 'function') {
    const compiled = input.toSQL();
    return {
      text: compiled?.sql || '',
      params: Array.isArray(compiled?.params) ? compiled.params : [],
    };
  }

  return { text: String(input ?? ''), params: [] };
}

export const db = {
  async execute(input: any): Promise<ExecuteResult> {
    const { text, params } = normalizeSql(input);
    if (!text) return { rows: [], rowCount: 0 };
    const result = await query(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  },
};

export default db;
