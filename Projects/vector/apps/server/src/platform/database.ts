import pg from 'pg';

export type Database = pg.Pool;

export function createDatabase(connectionString: string): Database {
  return new pg.Pool({ connectionString, max: 10 });
}

export async function pingDatabase(db: Database): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
