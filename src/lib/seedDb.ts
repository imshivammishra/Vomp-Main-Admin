import { ensureDatabase } from "./db/client";

let seeded = false;

/** Ensure the PostgreSQL schema and seed data exist before serving a request. */
export async function seedIfEmpty(): Promise<void> {
  if (seeded) return;
  await ensureDatabase();
  seeded = true;
}
