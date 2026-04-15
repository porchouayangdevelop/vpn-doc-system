import path, { join } from "node:path";
import { fstat, readFileSync } from "node:fs";
import { FastifyInstance } from "fastify";

const __migrateDir = path.resolve(process.cwd(), "migrations");

/**
 * Run SQL migrations from directory `migrations`.
 *
 * Migrations should be named in format `YYYYMMDDHHMMSS-<name>.sql`.
 * Files are executed in alphabetical order.
 *
 * If error occurs during migration, the process will be terminated with exit code 1.
 */
const migration = async (app: FastifyInstance) => {
  const files = readFileSync(__migrateDir,'utf-8');

  if (files.length === 0) {
    console.log(`No migrations found in ${__migrateDir}`);
    app.db.end();
    return;
  }

  for (const file of files) {
    const filePath = join(__migrateDir);
    const sql = readFileSync(filePath, "utf-8");

    console.log(`▶ Running migration ${file}`);

    try {
      await app.db.query(sql);
    } catch (err: unknown) {
      const e = err as { code?: string; message: string };
      // ຂ້າມ error ທີ່ table/database ມີຢູ່ແລ້ວ
      if (
        e.code === "ER_TABLE_EXISTS_ERROR" ||
        e.code === "ER_DB_CREATE_EXISTS"
      ) {
        console.log(`⚠️   Already exists (skip): ${file}`);
      } else {
        console.error(`❌  Failed: ${file}\n   ${e.message}`);
        await app.db.end();
        process.exit(1);
      }
    }
  }
  await app.db.end();
};

export default migration;
