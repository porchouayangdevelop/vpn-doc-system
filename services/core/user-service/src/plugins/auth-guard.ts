import type {UserContext,BankRole} from '@vpndoc/shared-types';
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppConfig } from "@/config/app.config";

async function authGuardPlugin(app: FastifyInstance) {
  // ── requireAuth: parse X-User-* headers ─────────────────
  app.decorate(
    "requireAuth",
    async function (req: FastifyRequest, reply: FastifyReply) {
      const userId = req.headers["x-user-id"] as string | undefined;
      const role = req.headers["x-user-role"] as BankRole | undefined;
      const branchId = req.headers["x-user-branch-id"] as string | undefined;

      if (!userId || !role || !branchId) {
        return reply.status(401).send({
          success: false,
          error: "Unauthorized",
          message: "Missing authentication headers",
        });
      }

      req.userCtx = {
        keycloakId: (req.headers["x-user-keycloak-id"] as string) ?? "",
        userId,
        employeeCode: (req.headers["x-user-employee-code"] as string) ?? "",
        fullName: (req.headers["x-user-full-name"] as string) ?? "",
        email: (req.headers["x-user-email"] as string) ?? "",
        role,
        branchId,
        departmentId:
          (req.headers["x-user-department-id"] as string | null) ?? null,
      };
    },
  );

  // ── requireRoles: ກວດ role ──────────────────────────────
  app.decorate(
    "requireRoles",
    (roles: string[]) => async (req: FastifyRequest, reply: FastifyReply) => {
      await app.requireAuth(req, reply);
      if (reply.sent) return;

      const { role } = req.userCtx;
      if (role !== "admin" && !roles.includes(role)) {
        return reply.status(403).send({
          success: false,
          error: "Forbidden",
          message: `Insufficient permissions Role ${role} is not allowed, Required: ${roles.join(", ")}`,
        });
      }
    },
  );

  // ── requireInternalSecret: internal-only endpoints ───────
  app.decorate('requireInternalSecret', async (req: FastifyRequest, reply: FastifyReply) => {
    const secret = req.headers['x-internal-secret'] as string | undefined;
    if (secret !== AppConfig.internalSecret) {
      return reply.status(401).send({
        success: false,
        error: "Invalid internal secret",
        message: "Invalid internal secret",
      });
    }
  });
}

export default fp(authGuardPlugin, {
  name: "auth-guard",
  // dependencies: ["config", "redis"],
});
