import fp from "fastify-plugin";
import mysql, { MySQLPromisePool } from "@fastify/mysql";
import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

async function mysqlPlugin(app: FastifyInstance) {
  await app.register(mysql, {
    promise: true,
    host: app.config.DB_HOST,
    port: app.config.DB_PORT,
    user: app.config.DB_USER,
    password: app.config.DB_PASS,
    database: app.config.DB_NAME,
  });
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
