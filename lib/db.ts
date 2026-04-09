import { Pool, QueryResult } from "pg";

const pool = new Pool({
  connectionString:
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL,
});

type SqlFn = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult>;
  query: (text: string, values?: unknown[]) => Promise<QueryResult>;
};

const sqlFn = async function (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult> {
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
} as SqlFn;

sqlFn.query = (text: string, values?: unknown[]) =>
  pool.query(text, values ?? []);

export const sql = sqlFn;
