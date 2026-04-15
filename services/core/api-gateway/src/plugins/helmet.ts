import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";

export default fp(
  async (app: FastifyInstance) => {
    await app.register(helmet, {
      contentSecurityPolicy: false,
    });
  },
  { name: "helmet" },
);
