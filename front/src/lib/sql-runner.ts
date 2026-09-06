import type { Database } from 'sql.js';

export type SqlRow = Record<string, string | number | null>;

let sqlPromise: Promise<typeof import('sql.js')> | null = null;

async function loadSqlJs() {
  if (!sqlPromise) {
    sqlPromise = import('sql.js');
  }
  const mod = await sqlPromise;
  const initSqlJs = mod.default;
  return initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });
}

export async function runPracticeQuery(
  setupSql: string,
  query: string
): Promise<{ rows: SqlRow[]; columns: string[] }> {
  const SQL = await loadSqlJs();
  const db: Database = new SQL.Database();
  try {
    db.run(setupSql);
    const result = db.exec(query);
    if (!result.length) {
      return { rows: [], columns: [] };
    }
    const { columns, values } = result[0];
    const rows: SqlRow[] = values.map((row) => {
      const obj: SqlRow = {};
      columns.forEach((col, i) => {
        const v = row[i];
        obj[col] = v === undefined ? null : (v as string | number | null);
      });
      return obj;
    });
    return { rows, columns };
  } finally {
    db.close();
  }
}
