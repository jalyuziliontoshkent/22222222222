import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __curtainPool: Pool | undefined;
}

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_URL ||
    ""
  );
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

function getDatabaseUrls() {
  const primary = getDatabaseUrl();
  if (!primary) return [];
  const urls = [primary];
  if (primary.includes(":6543/")) {
    urls.push(primary.replace(":6543/", ":5432/"));
  } else if (primary.includes(":5432/")) {
    urls.push(primary.replace(":5432/", ":6543/"));
  }
  return urls;
}

async function createPool() {
  const urls = getDatabaseUrls();
  if (!urls.length) {
    throw new Error("DATABASE_URL topilmadi");
  }

  let lastError: unknown;
  for (const connectionString of urls) {
    try {
      const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
      });
      await pool.query("SELECT 1");
      return pool;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Bazaga ulanib bo'lmadi");
}

export async function getPool() {
  if (!global.__curtainPool) {
    global.__curtainPool = await createPool();
  }
  return global.__curtainPool;
}

export async function query<T = any>(text: string, params: any[] = []) {
  const pool = await getPool();
  return pool.query<T>(text, params);
}

export async function queryOne<T = any>(text: string, params: any[] = []) {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

export async function queryValue<T = any>(text: string, params: any[] = []) {
  const row = await queryOne<Record<string, T>>(text, params);
  if (!row) return null;
  const firstKey = Object.keys(row)[0];
  return row[firstKey];
}
