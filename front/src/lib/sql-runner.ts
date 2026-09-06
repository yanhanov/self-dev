export type SqlRow = Record<string, string | number | null>;

export async function runPracticeQuery(
  setupSql: string,
  query: string
): Promise<{ rows: SqlRow[]; columns: string[] }> {
  const mod = await import('sql.js');
  const initSqlJs = mod.default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
  });
  const db = new SQL.Database();
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
