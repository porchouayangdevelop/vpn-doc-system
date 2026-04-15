import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { HealthResponseSchema } from "@/schemas";
import { ResultSetHeader, RowDataPacket } from "@fastify/mysql";
import internalRoutes from "@/modules/internal/internal.routes";
import authRoutes from "@/modules/auth/auth.routes";
import userRoutes from "@/modules/users/user.routes";
export default async function indexRoutes(app: FastifyInstance) {
  app.get(
    `/`,
    {
      schema: {
        summary: "Health check",
        tags: ["Health"],
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply): Promise<any> => {
      const results = Promise.all([
        await app.mysql.query("SELECT 1"),
        await app.mysql.query(
          "SELECT date_format(now(), '%Y-%m-%d %H:%i:%s') from dual;",
        ),
        app.mysql.query("SELECT  version() from dual;"),
      ]);

      const data = (await results).flatMap((r) => r[0] as any[]);

      return {
        success: true,
        error: null,
        message: "OK",
        data: data,
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
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
}
