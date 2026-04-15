import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import scalar from "@scalar/fastify-api-reference";

export default fp(
  async (app: FastifyInstance) => {
    // ── 1. Swagger spec generator ───────────────────────────
    await app.register(swagger, {
      openapi: {
        openapi: "3.0.3",
        info: {
          title: "VPN Doc — User Service",
          description:
            "ຈັດການ Bank User Profile, Role, Branch ແລະ Authentik sync",
          version: "1.0.0",
          contact: {
            name: "IT Team",
            email: "it@bank.la",
          },
        },
        servers: [
          { url: "http://localhost:3001", description: "Development" },
          { url: "http://localhost:3000", description: "Via API Gateway" },
        ],
        tags: [
          { name: "Auth", description: "Login, Me, Token info" },
          { name: "Users", description: "ຈັດການ bank user profile" },
          { name: "Branches", description: "ສາຂາ" },
          {
            name: "Internal",
            description:
              "Gateway internal endpoints (require X-Internal-Secret)",
          },
        ],
        components: {
          securitySchemes: {
            // ── Bearer token ຈາກ Authentik ─────────────────
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description:
                "Access token ຈາກ Authentik OIDC. Format: `Bearer <token>`",
            },
            // ── Internal secret header ──────────────────────
            internalSecret: {
              type: "apiKey",
              in: "header",
              name: "x-internal-secret",
              description:
                "Internal secret ສຳລັບ service-to-service (Gateway only)",
            },
          },
        },
        // ── Global: ທຸກ route ຕ້ອງ bearerAuth ─────────────
        security: [{ bearerAuth: [] }],
      },
    });

    // ── 2. Swagger UI (built-in Fastify UI) ────────────────
    await app.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
        tryItOutEnabled: true,
      },
      staticCSP: false,
    });

    // ── 3. Scalar API Reference ────────────────────────────
    await app.register(scalar, {
      routePrefix: "/reference",
      configuration: {
        theme: "purple",
        title: "VPN Doc — User Service API",
        // ── Authentication ─────────────────────────────────
        authentication: {
          preferredSecurityScheme: "bearerAuth",
          http: {
            bearer: {
              token: "", // user ໃສ່ token ໃນ UI
            },
          },
          apiKey: {
            token: process.env.INTERNAL_SECRET ?? "",
          },
        },

        // ── UI Options ─────────────────────────────────────
        hideModels: false,
        hideTryIt: false,
        hideDownloadButton: false,
        defaultOpenAllTags: true,
        withDefaultFonts: true,
        customCss: `
        .scalar-card { border-radius: 8px; }
      `,
      },
    });
  },
  {
    name: "swagger",
  },
);
