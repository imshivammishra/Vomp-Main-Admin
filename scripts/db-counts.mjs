import { PGlite } from "@electric-sql/pglite";
import { NodeFS } from "@electric-sql/pglite/nodefs";
import path from "node:path";

const dir = path.join(process.cwd(), "data", "pgdata");
const db = await PGlite.create({ fs: new NodeFS(dir) });
for (const table of ["countries", "states", "cities", "roles", "permissions", "settings", "homepage_sections", "navigation_items", "admin_users", "venues"]) {
  try {
    const r = await db.query(`SELECT COUNT(*)::text AS c FROM ${table}`);
    console.log(table, r.rows[0].c);
  } catch (error) {
    console.log(table, "ERR", error.message);
  }
}
await db.close();
process.exit(0);
