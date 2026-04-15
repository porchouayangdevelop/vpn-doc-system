import fp from "fastify-plugin";
import { diContainer } from "@fastify/awilix";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  const repos = ["branchRepo", "userRepo", "depRepo"] as const;
  for (const name of repos) {
    const repo = diContainer.resolve(name);
  }
});
