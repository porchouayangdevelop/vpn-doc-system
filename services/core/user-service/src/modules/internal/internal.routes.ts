import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import UserService from "@/modules/users/user.service";
import { Type, type Static } from "@sinclair/typebox";
import { authentikClient } from "@/lib/authentik-client";

const AuthentikSchema = Type.Object({
  authentikId: Type.String(),
});

const AuthentikArraySchema = Type.Array(AuthentikSchema);

const AuthentikSuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});

const AuthentikErrorResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

const AuthentikBody = Type.Object({
  authentikId: Type.String(),
  email: Type.String({ format: "email" }),
  fullName: Type.String({ maxLength: 100, minLength: 2 }),
  employeeCode: Type.String({ maxLength: 50, minLength: 2 }),
});

type Authentik = Static<typeof AuthentikSchema>;
type AuthentikArray = Static<typeof AuthentikArraySchema>;
type AuthentikSuccessResponse = Static<typeof AuthentikSuccessResponseSchema>;
type AuthentikErrorResponse = Static<typeof AuthentikErrorResponseSchema>;
type AuthentikBody = Static<typeof AuthentikBody>;

export default async function internalRoutes(app: FastifyInstance) {
  const userService = new UserService(app);
  app.addHook("preHandler", app.requireInternalSecret);

  app.get(
    `/users/by-authentik/:authentikId`,
    {
      schema: {
        summary: "Get user by authentikId",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        params: AuthentikSchema,
        response: {
          200: AuthentikSuccessResponseSchema,
          404: AuthentikErrorResponseSchema,
        },
      },
    },

    async (
      req: FastifyRequest<{ Params: { authentikId: string } }>,
      reply: FastifyReply,
    ) => {
      const { authentikId } = req.params;

      const cached = await userService.getUserByAuthentikId(authentikId);
      if (cached) {
        return reply.code(200).send({
          success: true,
          message: `User with authentikId ${authentikId} found`,
          data: cached,
        });
      }

      try {
        const user = await userService.provisionUserByAuthentikId(authentikId);
        return reply.code(200).send({
          success: true,
          message: `User with authentikId ${authentikId} provisioned`,
          data: user,
        });
      } catch (error: any | unknown) {
        const e = error as {
          statusCode?: number;
          message?: string;
        };
        if (e.statusCode === 404) {
          return reply.code(404).send({
            success: false,
            error: "NOT_FOUND",
            statusCode: 404,
            message: `User with authentikId ${authentikId} not found`,
          });
        } else {
          return reply.code(e.statusCode ?? 500).send({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
            statusCode: 500,
            message:
              e.message ??
              `User with authentikId ${authentikId} provision failed`,
          });
        }
      }
    },
  );

  // ──────────────────────────────────────────────────────────
  // POST /internal/users/sync/:userId
  // Force re-sync ຈາກ Authentik (role ປ່ຽນ, branch ຍ້າຍ)
  // ──────────────────────────────────────────────────────────
  app.post(
    `
    /users/sync/:userId`,
    {
      schema: {
        summary: "Sync user from Authentik",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          userId: Type.String(),
        }),
        response: {
          200: AuthentikSuccessResponseSchema,
          404: AuthentikErrorResponseSchema,
        },
      },
    },
    async (
      req: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply,
    ) => {
      const { userId } = req.params;
      try {
        const user = await userService.syncFromAuthentik(userId!);
        return reply.code(200).send({
          success: true,
          message: `User with id ${userId} synced from Authentik`,
          data: user,
        });
      } catch (error: any | unknown) {
        const e = error as {
          statusCode?: number;
          message?: string;
        };
        if (e.statusCode === 404) {
          return reply.code(404).send({
            success: false,
            error: "NOT_FOUND",
            statusCode: 404,
            message: `User with id ${userId} not found`,
          });
        } else {
          return reply.code(e.statusCode ?? 500).send({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
            statusCode: 500,
            message: e.message ?? `User with id ${userId} sync failed`,
          });
        }
      }
    },
  );

  // ──────────────────────────────────────────────────────────
  // GET /internal/authentik/users/:uuid
  // Debug: ເບິ່ງ raw Authentik user data
  // ──────────────────────────────────────────────────────────
  app.get(
    `/authentik/users/:uuid`,
    {
      schema: {
        summary: "Debug: view raw Authentik user data",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          uuid: Type.String(),
        }),
        response: {
          200: AuthentikSuccessResponseSchema,
          404: AuthentikErrorResponseSchema,
        },
      },
    },
    async (
      req: FastifyRequest<{ Params: { uuid: string } }>,
      reply: FastifyReply,
    ) => {
      const { uuid } = req.params;
      const user = await authentikClient.getFullUser(uuid);
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: "NOT_FOUND",
          statusCode: 404,
          message: `User with uuid ${uuid} not found`,
        });
      } else {
        return reply.code(200).send({
          success: true,
          message: `User with uuid ${uuid} found`,
          data: user,
        });
      }
    },
  );

  // POST /internal/users/provision
  // Gateway ເອີ້ນ ເມື່ອ user login ຄັ້ງທຳອິດ
  app.post(
    `/users/provision`,
    {
      schema: {
        summary: "Provision user",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        body: AuthentikBody,
        response: {
          200: AuthentikSuccessResponseSchema,
          404: AuthentikErrorResponseSchema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authentikId, email, fullName, employeeCode } =
        req.body as AuthentikBody;

      const user = await userService.provisionUser(
        authentikId,
        fullName,
        email,
        employeeCode,
      );

      if (!user)
        return reply.code(404).send({
          success: false,
          error: "NOT_FOUND",
          statusCode: 404,
          message: `User with authentikId ${authentikId} not found`,
        });
      return reply.code(200).send({
        success: true,
        message: `User with authentikId ${authentikId} found`,
        data: user,
      });
    },
  );
}
