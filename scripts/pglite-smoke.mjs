import { PGlite } from "@electric-sql/pglite";
import { NodeFS } from "@electric-sql/pglite/nodefs";
import path from "node:path";
import fs from "node:fs";

const dir = path.join(process.cwd(), "data", "pg-test");
fs.mkdirSync(dir, { recursive: true });

const db = await PGlite.create({ fs: new NodeFS(dir) });
await db.exec(`CREATE TABLE IF NOT EXISTS t (id serial primary key, name text not null);`);
await db.query(`INSERT INTO t (name) VALUES ($1)`, ["hello"]);
const r = await db.query(`SELECT * FROM t`);
console.log(r.rows);
await db.close();
