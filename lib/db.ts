import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
});

// Tagged template literal — drop-in replacement for @vercel/postgres sql tag
async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  let query = "";
  const params: unknown[] = [];
  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      params.push(values[i]);
      query += `$${params.length}`;
    }
  });
  return pool.query(query, params);
}

// Also expose sql.query for raw string queries (used in runGenerateSQLQuery)
sql.query = (query: string, values?: unknown[]) =>
  pool.query(query, values ?? []);

export { sql };
