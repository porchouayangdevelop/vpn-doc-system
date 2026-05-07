import fp from "fastify-plugin";
import fastifyEnv, { FastifyEnvOptions } from "@fastify/env";
import { Type, type Static } from "@sinclair/typebox";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

const schema = Type.Object({
  NODE_ENV: Type.String(),
  HOST: Type.Optional(Type.String()),
  PORT: Type.Number(),
  LOG_LEVEL: Type.String(),

  KEYCLOAK_JWKS_URL: Type.String(),
  KEYCLOAK_ISSUER: Type.String(),
  USER_SERVICE_URL: Type.String(),
  DOCUMENT_SERVICE_URL: Type.String(),
  APPROVAL_SERVICE_URL: Type.String(),
  NOTIFICATION_SERVICE_URL: Type.String(),
  AUDIT_SERVICE_URL: Type.String(),
  REPORT_SERVICE_URL: Type.String(),

  REDIS_HOST: Type.String(),
  REDIS_PASS: Type.String(),
  REDIS_PORT: Type.Number(),
  REDIS_URL: Type.Optional(Type.String()),

  INTERNAL_SECRET: Type.String(),

  CORS_ORIGIN: Type.Optional(Type.String()),
});

export type Env = Static<typeof schema>;

export default fp<FastifyEnvOptions>(
  async (app: FastifyInstance, opts: FastifyPluginOptions) => {
    app.register(fastifyEnv, {
      schema,
      env: true,
      confKey: "config",
      prefix: "API_GATEWAY_",
      logLevel: "info",
      dotenv: true,
    });
  },
);

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
  }
}
