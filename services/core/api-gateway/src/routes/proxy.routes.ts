import type { FastifyInstance } from "fastify";
import httpProxy from "@fastify/http-proxy";
import { gatewayAuth } from "@/middleware/gateway-auth";

export default async function proxyRoute(app: FastifyInstance) {
  const auth = gatewayAuth(app);

  const routes: Array<{
    prefix: string;
    upstream: string;
    ws?: boolean;
  }> = [
    { prefix: "/api/v1/users", upstream: app.config.USER_SERVICE_URL! },
    {
      prefix: "/api/v1/documents",
      upstream: app.config.DOCUMENT_SERVICE_URL!,
    },
    {
      prefix: "/api/v1/approvals",
      upstream: app.config.APPROVAL_SERVICE_URL!,
    },
    {
      prefix: "/api/v1/notifications",
      upstream: app.config.NOTIFICATION_SERVICE_URL!,
    },
    { prefix: "/api/v1/audit", upstream: app.config.AUDIT_SERVICE_URL! },
    { prefix: "/api/v1/reports", upstream: app.config.REPORT_SERVICE_URL! },
    {
      prefix: "/api/v1/ws",
      upstream: app.config.NOTIFICATION_SERVICE_URL!,
      ws: true,
    },
  ];

  for (const route of routes) {
    await app.register(httpProxy, {
      upstream: route.upstream,
      prefix: route.prefix,
      rewritePrefix: route.prefix,
      // preHandler: route.ws ? false : auth,
      websocket: route.ws ?? false,
      httpMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      replyOptions: {
        rewriteRequestHeaders: (_req, headers) => headers,
      },
    });
  }
}
