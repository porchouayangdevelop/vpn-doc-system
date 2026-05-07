import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SuccessResponse, ErrorResponse } from "@/schemas";
import internalRoutes from "@/modules/internal/internal.routes";
import authRoutes from "@/modules/auth/auth.routes";
import userRoutes from "@/modules/users/user.routes";
import { Type } from "@sinclair/typebox";

const HealtSchema = Type.Object({
  ...SuccessResponse,
});

export default async function indexRoutes(app: FastifyInstance) {
  app.get(
    `/`,
    {
      schema: {
        summary: "Health check",
        tags: ["Health"],
        response: {
          200: HealtSchema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply): Promise<any> => {
      return {
        success: true,
        error: null,
        message: "OK",
        data: "",
      };
    },
  );

  app.get("/redis/health", async (req: FastifyRequest, reply: FastifyReply) => {
    const { fastifyRedis } = app;
    const data = await fastifyRedis.get("foo");

    return { success: true, error: null, message: "OK", data };
  });

  app.get(
    "/redis",
    async (
      req: FastifyRequest<{ Querystring: { key: string } }>,
      reply: FastifyReply,
    ) => {
      const { fastifyRedis } = app;
      const data = await fastifyRedis.get(req.query.key);

      return { success: true, error: null, message: "OK", data };
    },
  );

  app.post(
    "/redis",
    (
      req: FastifyRequest<{
        Body: {
          key: string;
          value: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { fastifyRedis } = app;
      fastifyRedis.set(req.body.key, req.body.value);
      return {
        success: true,
        error: null,
        message: "OK",
      };
    },
  );

  await app.register(internalRoutes, { prefix: "/internal" });
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(userRoutes, { prefix: "/users" });
}
