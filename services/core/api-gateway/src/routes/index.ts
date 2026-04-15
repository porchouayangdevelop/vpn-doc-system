import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import proxyRoute from "./proxy.routes";
import { Type, type Static } from "@sinclair/typebox";

const healthSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
  timestamp: Type.Optional(Type.String()),
});

export default async function indexRoute(app: FastifyInstance) {
  app.get(
    "/health",
    {
      handlerTimeout: 5000,
      errorHandler: (error, req: FastifyRequest, reply: FastifyReply) => {
        if (error) {
          return reply.send({
            success: false,
            error: error.message || "Gateway timeout",
            message: error.message,
            data: null,
            timestamp: new Date().toISOString(),
          });
        }

        return reply.send({
          success: true,
          error: "Gateway is normal",
          message: "OK",
          data: null,
          timestamp: new Date().toISOString(),
        });
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        error: "Gateway is normal",
        message: "OK",
        data: null,
        timestamp: new Date().toISOString(),
      });
    },
  );

  app.register(proxyRoute, { prefix: "/proxy" });
}
