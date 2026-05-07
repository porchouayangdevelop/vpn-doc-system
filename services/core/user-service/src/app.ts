import { log } from "console";
import autoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import Fastify, {
  type FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
  errorCodes,
} from "fastify";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  TypeBoxTypeProvider,
  TypeBoxValidatorCompiler,
  Type,
} from "@fastify/type-provider-typebox";
import devtools from "@attaryz/fastify-devtools";
import logger from "@mgcrea/fastify-request-logger";
import prettier from "@mgcrea/pino-pretty-compact";

// "@vpndoc/shared-types": "workspace:*"
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: {
      level: "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              // target: "@mgcrea/pino-pretty-compact",
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    } as any,
    disableRequestLogging: true,
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

  app.register(logger);

  //register routes
  await app.register(autoLoad, {
    dir: join(__dirname, "routes/"),
    prefix: "/api/v1",
    forceESM: true,
  });

  app.get("/openapi.json", async (req: FastifyRequest, reply: FastifyReply) => {
    return app.swagger();
  });

  app.ready();

  //error handler
  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      if (error.statusCode === 429) {
        reply.code(Number(429));
        error.message = "You hit the rate limit! Slow down please!";
      }
      if (error.statusCode === 403) {
        reply.status(error.statusCode || Number(403)).send({
          success: false,
          statusCode: error?.statusCode || Number(403),
          error: error?.message,
          stack: error?.stack,
        });
      }

      if (error.statusCode === 500) {
        reply.status(error.statusCode || Number(500)).send({
          success: false,
          statusCode: error?.statusCode || Number(500),
          error: error?.message,
          stack: error?.stack,
        });
      }

      if (error instanceof errorCodes.FST_ERR_BAD_STATUS_CODE) {
        reply.status(error.statusCode || Number(500)).send({
          success: false,
          statusCode: error?.statusCode || Number(500),
          error: error?.message,
          stack: error?.stack,
        });
      }

      if (error instanceof errorCodes.FST_ERR_FAILED_ERROR_SERIALIZATION) {
        reply.status(error.statusCode || Number(500)).send({
          success: false,
          statusCode: error?.statusCode || Number(500),
          error: error?.message,
          stack: error?.stack,
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
