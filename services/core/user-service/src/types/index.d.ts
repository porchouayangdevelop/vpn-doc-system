import type { UserContext } from "@vpndoc/shared-types";
import type { FastifyRequest, FastifyReply } from "fastify";
import { type BankRole } from "@vpndoc/shared-types";

declare module "fastify" {
  interface FastifyRequest {
    userCtx: UserContext;
  }

  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRoles: (
      roles: string[] | BankRole[],
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireInternalSecret: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
