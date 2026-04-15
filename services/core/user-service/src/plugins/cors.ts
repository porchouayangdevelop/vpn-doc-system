import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

async function corsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin: false,
  });
}

export default fp(corsPlugin, {
  name: "cors",
});
