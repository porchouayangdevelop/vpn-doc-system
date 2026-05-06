import fp from "fastify-plugin";
import fastifyEnv, { FastifyEnvOptions } from "@fastify/env";
import { type FastifyInstance } from "fastify";
import { Type, type Static } from "@sinclair/typebox";

const schema = Type.Object({
  NODE_ENV: Type.String(),
  HOST: Type.Optional(Type.String()),
  PORT: Type.Number(),

  // Database mariadb
  DB_HOST: Type.String(),
  DB_PORT: Type.Number(),
  DB_NAME: Type.String(),
  DB_USER: Type.String(),
  DB_PASS: Type.String(),
  DB_URL: Type.Optional(Type.String()),
  DB_CONNECTION_LIMIT: Type.Optional(Type.Number()),
  DB_ACQUIRE_TIMEOUT: Type.Optional(Type.Number()),

  // Postgres
  POSTGRES_HOST: Type.Optional(Type.String()),
  POSTGRES_PORT: Type.Optional(Type.Number()),
  POSTGRES_USER: Type.Optional(Type.String()),
  POSTGRES_PASSWORD: Type.Optional(Type.String()),
  POSTGRES_DB: Type.Optional(Type.String()),
  POSTGRES_URL: Type.Optional(Type.String()),

  // Keycloak — user-facing client
  KEYCLOAK_URL: Type.String(),
  KEYCLOAK_BASE_URL: Type.String(),
  KEYCLOAK_REALM: Type.String(),
  KEYCLOAK_CLIENT_ID: Type.String(),
  KEYCLOAK_CLIENT_SECRET: Type.String(),

  //redis
  REDIS_HOST: Type.String(),
  REDIS_PASS: Type.String(),
  REDIS_PORT: Type.Number(),
  REDIS_URL: Type.Optional(Type.String()),

  //internal
  INTERNAL_SECRET: Type.String(),
});

type Env = Static<typeof schema>;

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(fastifyEnv, {
      confKey: "config",
      schema,
      dotenv: true,
      data: process.env,
    });

    fastify.decorate("configEnv", fastify.config);
  },
  { name: "env" },
);
