import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import UserService from "@/modules/users/user.service";
import { Type, type Static } from "@sinclair/typebox";
import { keycloakClient } from "@/lib/keycloak-client";

const KeycloakParamsSchema = Type.Object({
  keycloakId: Type.String(),
});

const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});

const ErrorResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

const ProvisionBody = Type.Object({
  keycloakId: Type.String(),
  email: Type.String({ format: "email" }),
  fullName: Type.String({ maxLength: 100, minLength: 2 }),
  employeeCode: Type.String({ maxLength: 50, minLength: 2 }),
});

type ProvisionBody = Static<typeof ProvisionBody>;

export default async function internalRoutes(app: FastifyInstance) {
  const userService = app.diContainer.resolve("userService") as UserService;
  app.addHook("preHandler", app.requireInternalSecret);

  app.get(
    `/users/by-keycloak/:keycloakId`,
    {
      schema: {
        summary: "Get user by keycloakId",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        params: KeycloakParamsSchema,
        response: {
          200: SuccessResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },

    async (
      req: FastifyRequest<{ Params: { keycloakId: string } }>,
      reply: FastifyReply,
    ) => {
      const { keycloakId } = req.params;

      const cached = await userService.getUserByKeycloakId(keycloakId);
      if (cached) {
        return reply.code(200).send({
          success: true,
          message: `User with keycloakId ${keycloakId} found`,
          data: cached,
        });
      }

      try {
        const user = await userService.provisionUserByKeycloakId(keycloakId);
        return reply.code(200).send({
          success: true,
          message: `User with keycloakId ${keycloakId} provisioned`,
          data: user,
        });
      } catch (error: any | unknown) {
        const e = error as { statusCode?: number; message?: string };
        if (e.statusCode === 404) {
          return reply.code(404).send({
            success: false,
            error: "NOT_FOUND",
            statusCode: 404,
            message: `User with keycloakId ${keycloakId} not found`,
          });
        } else {
          return reply.code(e.statusCode ?? 500).send({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
            statusCode: 500,
            message:
              e.message ??
              `User with keycloakId ${keycloakId} provision failed`,
          });
        }
      }
    },
  );

  app.post(
    `/users/sync/:userId`,
    {
      schema: {
        summary: "Sync user from Keycloak",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          userId: Type.String(),
        }),
        response: {
          200: SuccessResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (
      req: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply,
    ) => {
      const { userId } = req.params;
      try {
        const user = await userService.syncFromAuth(userId!);
        return reply.code(200).send({
          success: true,
          message: `User with id ${userId} synced from Keycloak`,
          data: user,
        });
      } catch (error: any | unknown) {
        const e = error as { statusCode?: number; message?: string };
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

  app.get(
    `/keycloak/users/:uuid`,
    {
      schema: {
        summary: "Debug: view raw Keycloak user data",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          uuid: Type.String(),
        }),
        response: {
          200: SuccessResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (
      req: FastifyRequest<{ Params: { uuid: string } }>,
      reply: FastifyReply,
    ) => {
      const { uuid } = req.params;
      const user = await keycloakClient.getUserById(uuid);
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

  app.post(
    `/users/provision`,
    {
      schema: {
        summary: "Provision user",
        tags: ["Internal"],
        security: [{ bearerAuth: [] }],
        body: ProvisionBody,
        response: {
          200: SuccessResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { keycloakId, email, fullName, employeeCode } =
        req.body as ProvisionBody;

      const user = await userService.provisionUser(
        keycloakId,
        fullName,
        email,
        employeeCode,
      );

      if (!user)
        return reply.code(404).send({
          success: false,
          error: "NOT_FOUND",
          statusCode: 404,
          message: `User with keycloakId ${keycloakId} not found`,
        });
      return reply.code(200).send({
        success: true,
        message: `User with keycloakId ${keycloakId} found`,
        data: user,
      });
    },
  );
}
