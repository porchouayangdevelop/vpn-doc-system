import fp from "fastify-plugin";
import mysql, { FastifyMySQLOptions, MySQLPromisePool } from "@fastify/mysql";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

type mySqlOption = {
  promise: boolean;
  connectionString: string;
} & FastifyMySQLOptions;

async function mysqlPlugin(app: FastifyInstance) {
  await app.register(mysql, {
    promise: true,
    connectionString: app.config.DB_URL,
  } as mySqlOption);

  // app.decorate("mysql", app.mysql);
}

export default fp<FastifyPluginAsync>(mysqlPlugin, {
  name: "mysql",
  dependencies: ["env"],
});

declare module "fastify" {
  interface FastifyInstance {
    mysql: MySQLPromisePool;
  }
}
