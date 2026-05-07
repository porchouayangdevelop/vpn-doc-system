import type {
  FastifyInstance,
  FastifyBaseLogger,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { KeycloakClaims } from "@vpndoc/shared-types";
import * as jose from "jose";

const USER_CTX_TLL = 300; // 5 minutes

async function fetchUserContext(
  app: FastifyInstance,
  keycloakId: string,
  claims: KeycloakClaims,
): Promise<Record<string, string>> {
  const cacheKey = `gateway:user_ctx:${keycloakId}`;
  const cached = await app.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as Record<string, string>;
  }

  const url = `http://${app.config.USER_SERVICE_URL}/api/users/internal/by-keycloak/${keycloakId}`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-internal-secret": app.config.INTERNAL_SECRET!,
      },
      signal: AbortSignal.timeout(3_000),
    });

    if (res.status === 404) {
      const provRes = await fetch(
        `${app.config.USER_SERVICE_URL}/api/users/internal/users/provision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": app.config.INTERNAL_SECRET!,
          },
          body: JSON.stringify({
            keycloakId,
            email: claims.email ?? "",
            fullName: claims.name ?? "",
            employeeCode: claims.employee_code ?? "",
          }),
          signal: AbortSignal.timeout(3_000),
        },
      );
      if (provRes.ok) {
        const { data } = (await provRes.json()) as {
          data: Record<string, string>;
        };
        await app.redis.setex(cacheKey, USER_CTX_TLL, JSON.stringify(data));
        return data;
      }
    }

    if (res.ok) {
      const { data } = (await res.json()) as { data: Record<string, string> };
      await app.redis.setex(cacheKey, USER_CTX_TLL, JSON.stringify(data));
      return data;
    }
  } catch (error: FastifyBaseLogger | any) {
    app.log.warn(
      { error, keycloakId },
      "user-service uncreachable - using JWT claims",
    );
  }

  return {
    id: keycloakId,
    role: (claims["role"] as string) ?? "maker",
    branch_id: (claims["branch_id"] as string) ?? "",
    employee_code: (claims["employee_code"] as string) ?? "",
  };
}

export function gatewayAuth(app: FastifyInstance) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({
        success: false,
        error: "Unauthorized",
        message: "Missing authentication headers",
      });
    }

    const token = authHeader.slice(7);
    let claims: jose.JWTPayload & KeycloakClaims;

    try {
      claims = (await app.verifyToken(token)) as typeof claims;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Token error";
      app.log.warn({ msg }, `Token verification failed`);
      return reply.code(401).send({
        success: false,
        error: "Invalid or expired token",
        message: msg,
      });
    }

    const userCtx = await fetchUserContext(app, claims.sub!, claims);

    // Inject X-User-* headers → upstream service
    req.headers["x-user-id"] = userCtx["id"] ?? claims.sub!;
    req.headers["x-user-keycloak-id"] = claims.sub!;
    req.headers["x-user-role"] = userCtx["role"] ?? "maker";
    req.headers["x-user-branch-id"] = userCtx["branch_id"] ?? "";
    req.headers["x-user-department-id"] = userCtx["department_id"] ?? "";
    req.headers["x-user-email"] = claims.email ?? "";
    req.headers["x-user-name"] = claims.name ?? "";
    req.headers["x-user-employee-code"] = userCtx["employee_code"] ?? "";

    delete req.headers["authorization"];
  };
}
