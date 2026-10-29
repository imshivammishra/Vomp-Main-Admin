/**
 * CLI entry point for applying migrations and seed data.
 *
 *   npm run db:migrate      # idempotent — safe to run on every deploy
 *   npm run db:seed         # alias, seeds reference data and legacy JSON
 */
import { closeDatabase, driver, ensureDatabase } from "./db/client";

async function main() {
  const started = Date.now();
  console.log(`[db] Using ${driver()} driver`);
  await ensureDatabase();
  console.log(`[db] Migrations and seed data are up to date (${Date.now() - started}ms).`);
}

main()
  .then(async () => {
    await closeDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[db] Migration failed:", error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
