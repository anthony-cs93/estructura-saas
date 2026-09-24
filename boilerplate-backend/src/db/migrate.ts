import { getDb } from './client.js';
import { migrations } from './migrations/index.js';

export async function runMigrations(retries = 5): Promise<void> {
  const db = getDb();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        )`,
      );

      const appliedRows = await db.execute('SELECT id FROM schema_migrations');
      const applied = new Set(appliedRows.rows.map((row) => String(row.id)));

      for (const migration of migrations) {
        if (applied.has(migration.id)) continue;
        for (const statement of migration.up) {
          await db.execute(statement);
        }
        await db.execute({
          sql: 'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)',
          args: [migration.id, new Date().toISOString()],
        });
        console.log(`[migrate] aplicada ${migration.id}`);
      }
      return;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      console.warn(`[migrate] base de datos no disponible, reintento ${attempt + 1}/${retries}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}
