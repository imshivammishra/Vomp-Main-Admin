import { PGlite } from "@electric-sql/pglite";
import { NodeFS } from "@electric-sql/pglite/nodefs";
import path from "node:path";
import fs from "node:fs";

const dir = path.join(process.cwd(), "data", "pg-smoke2");
fs.mkdirSync(dir, { recursive: true });
const db = await PGlite.create({ fs: new NodeFS(dir) });
await db.exec(`CREATE TABLE IF NOT EXISTS t (id serial primary key, name text);`);
const res = await db.query(`INSERT INTO t (name) VALUES ($1)`, ["x"]);
console.log(JSON.stringify(res, (k, v) => (typeof v === "bigint" ? String(v) : v), 2));
const u = await db.query(`SELECT 1`);
console.log(Object.keys(u), u.affectedRows);
await db.close();
