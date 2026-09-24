import { runMigrations } from '../db/migrate.js';

runMigrations()
  .then(() => {
    console.log('Migraciones al día');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error ejecutando migraciones:', err);
    process.exit(1);
  });
