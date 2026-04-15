import { config } from "dotenv";
import { AppConfig } from "./../config/app.config";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { createPool, PoolConnection, Pool } from "mariadb";

export interface Db {
  query<T = any>(sql: string, params?: any[] | unknown[]): Promise<T>;
  execute<T = any>(sql: string, params?: any[] | unknown[]): Promise<T>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  pool: Pool;
}

function createDbPool(pool: Pool): Db {
  return {
    pool,

    async query<T = any>(sql: string, params?: any[] | unknown[]): Promise<T> {
      return pool.query(sql, params);
    },

    async execute<T = any>(
      sql: string,
      params?: any[] | unknown[],
    ): Promise<T> {
      return pool.query(sql, params);
    },

    async transaction(fn){
      const con = await pool.getConnection();
      try {
        await con.beginTransaction();
        const tx:Db {
          pool,
          q
          
        }

        await con.commit();
        return result;
      } catch (error: any) {
        await con.rollback();
        throw error;
      } finally {
        con.release();
      }
    },
  };
}

async function dbPlugin(app: FastifyInstance) {
  let con: PoolConnection | null = null;

  const PromisePool: Pool = createPool({
    host: AppConfig.db.host,
    port: AppConfig.db.port,
    user: AppConfig.db.user,
    password: AppConfig.db.pass,
    database: AppConfig.db.name,

    connectionLimit: 10,
    acquireTimeout: 5_000,
    idleTimeout: 60_000,
    initializationTimeout: 5_000,
    trace: false,

    dateStrings: true,
    timezone: "+07:00",

    metaAsArray: false,

    bulk: true,

    insertIdAsNumber: true,
    decimalAsNumber: true,
    bigIntAsNumber: true,
    charset: "utf8mb4",
    connectTimeout: 10_000,
    checkDuplicate: true,
    minimumIdle: 0,
    maxAllowedPacket: 0,
    collation: "utf8mb4_general_ci",
    multipleStatements: true,
    queryTimeout: 60_000,
    debug: false,
    // ssl: {
    //   rejectUnauthorized: true,
    // },
  });

  try {
    con = await PromisePool.getConnection();
    app.log.info("Database connected");
  } catch (err: any) {
    app.log.error(
      {
        err,
        code: err.code,
        errno: err.errno,
        sqlState: err.sqlState,
        fatal: err.fatal,
      },
      "mariadb health check failed",
    );
    throw err;
  } finally {
    if (con) con.release();
  }

  app.decorate("db", PromisePool);

  app.addHook("onClose", async () => {
    await PromisePool.end();
    app.log.info("session closed");
  });
}

export default fp(dbPlugin, {
  name: "db",
});

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}
