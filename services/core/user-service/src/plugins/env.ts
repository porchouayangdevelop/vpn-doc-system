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

  // Authentik
  AUTHENTIK_URL: Type.String(),
  AUTHENTIK_API_TOKEN: Type.String(),
  AUTHENTIK_ROLE_ATTR: Type.Optional(Type.String()),
  AUTHENTIK_BRANCH_ATTR: Type.Optional(Type.String()),
  AUTHENTIK_DEPT_ATTR: Type.Optional(Type.String()),
  AUTHENTIK_EMP_CODE_ATTR: Type.Optional(Type.String()),
  

  //call authentik
  AUTHENKTIK_CLIENT_ID: Type.String(),
  AUTHENTIK_CLIENT_SECRET: Type.String(),
  AUTHENTIK_TOKEN_URL: Type.String(),
  AUTHENTIK_REVOKE_URL: Type.String(),
  AUTHENTIK_OPEN_ID_URL: Type.Optional(Type.String()),
  AUTHENTIK_LOGOUT_URL: Type.Optional(Type.String()),
  AUTHENTIK_AUTHORIZE_URL: Type.Optional(Type.String()),
  AUTHENTIK_ISSUER_URL: Type.Optional(Type.String()),
  AUTHENTIK_JWKS_URL: Type.Optional(Type.String()),
  AUTHENTIK_USER_INFO_URL: Type.Optional(Type.String()),

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
