import Fastify, {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from "fastify";
import {
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
} from "@fastify/type-provider-typebox";
import autoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: {
      level: "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: { colorize: true },
            }
          : undefined,
    } as any,
    disableRequestLogging: false,
    pluginTimeout: 20000,
    trustProxy: true,
    genReqId: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  })
    .withTypeProvider<TypeBoxTypeProvider>()
    .setValidatorCompiler(TypeBoxValidatorCompiler);

  // register plugins
  await app.register(autoLoad, {
    dir: join(__dirname, "plugins"),
    forceESM: true,
  });

  //register routes
  await app.register(autoLoad, {
    dir: join(__dirname, "routes"),
    prefix: "/api/v1",
    forceESM: true,
  });

  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      if (error.statusCode === 429) {
        reply.code(Number(429));
        error.message = "You hit the rate limit! Slow down please!";
      }
      if (error.statusCode === 403) {
        reply.status(error.statusCode || Number(403)).send({
          statusCode: error?.statusCode || Number(403),
          error: error?.message,
          stack: error?.stack,
        });
      }

      if (error.statusCode === 500) {
        app.log.error({ error, request: _request.url }, "Gateway error");
        reply.status(error.statusCode || Number(500)).send({
          success: false,
          statusCode: error?.statusCode || Number(500),
          error: error?.message,
          stack: error?.stack,
          message: error?.message,
        });
      }

      reply.send(error);
    },
  );

  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    reply.status(Number(404)).send({
      success: false,
      statusCode: Number(404),
      error: "Not Found",
      message: "The requested resource could not be found.",
    });
  });

  return app;
}
