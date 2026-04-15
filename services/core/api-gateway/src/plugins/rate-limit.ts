import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

export default fp(
  async (app: FastifyInstance) => {
    await app.register(rateLimit, {
      max: 200,
      timeWindow: "1 minute",
    });
  },
  { name: "rate-limit" },
);
