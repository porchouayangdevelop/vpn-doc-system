import { type FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  CreateUserWithKeycloakDto,
  UpdateUserSchema,
  ListUsersQuerySchema,
} from "./user.schema";
import {
  BadGatewayResponseSchema,
  SuccessResponseSchema,
  CreateResponseSchema,
  ErrorResponseSchema,
  NotFoundResponseSchema,
  UnAuthorizedResponseSchema,
  BadRequestResponseSchema,
  NotContentResponseSchema,
  ForbiddenResponseSchema,
  InternalServerErrorResponseSchema,
  RequestTimeOutResponseSchema,
} from "@/schemas/index";

import { Type } from "@sinclair/typebox";

export default async function userRoutes(app: FastifyInstance) {
  //get me
  app.get(
    "/me",
    {
      schema: {
        summary: "Get user",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        response: {
          200: SuccessResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireAuth],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;

      const user = await authService.getMe(
        req.userCtx.userId,
        req.userCtx.authentikId,
      );
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: "Not found",
          message: "Missing user not found",
        });
      }
      return reply.status(200).send({
        success: true,
        message: "User found",
        data: user,
      });
    },
  );

  //get users
  app.get(
    `/`,
    {
      schema: {
        summary: "Get users",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        response: {
          200: SuccessResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireRoles(["admin", "it_header", "it_po"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;
      const query = ListUsersQuerySchema.parse(req.query);
      const result = await userService.listUsers(query);
      return reply.status(200).send({
        success: true,
        message: "Users found",
        data: result,
      });
    },
  );

  //get user byId
  app.get(
    `/:id`,
    {
      schema: {
        // headers: {
        //   "x-user-id": { type: "string" },
        //   "x-user-authentik-id": { type: "string" },
        //   "x-user-role": { type: "string" },
        //   "x-user-branch-id": { type: "string" },
        //   "x-user-department-id": { type: "string" },
        //   "x-user-email": { type: "string" },
        //   "x-user-name": { type: "string" },
        //   "x-user-employee-code": { type: "string" },
        // },
        params: Type.Object({
          id: Type.String(),
        }),
        summary: "Get user by id",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        response: {
          200: SuccessResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          403: ForbiddenResponseSchema,
          404: NotFoundResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireRoles(["admin", "it_header"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;
      const { id } = req.params as { id: string };
      const user = await userService.getUserById(id);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: "Not found",
          message: "Missing user not found",
        });
      }
      return reply.status(200).send({
        success: true,
        message: "User found",
        data: user,
      });
    },
  );

  // create user admin only
  app.post(
    `/`,
    {
      schema: {
        summary: "Create user",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        body: CreateUserWithKeycloakDto,
        response: {
          // 200: SuccessResponseSchema,
          201: CreateResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          403: ForbiddenResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireRoles(["admin"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;
      const dto = CreateUserWithKeycloakDto.parse(req.body);
      const user = await userService.createUserWithKeycloak(dto);
      return reply.status(201).send({
        success: true,
        message: "User created",
        data: user,
      });
    },
  );

  // update user
  app.patch(
    `/:id`,
    {
      schema: {
        summary: "Update user",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        body: UpdateUserSchema,
        response: {
          200: SuccessResponseSchema,
          201: CreateResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          403: ForbiddenResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireRoles(["admin"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;
      const { id } = req.params as { id: string };
      const dto = UpdateUserSchema.parse(req.body);
      const user = await userService.updateUser(id, dto);
      return reply.status(200).send({
        success: true,
        message: "User updated",
        data: user,
      });
    },
  );

  // delete user
  app.delete(
    `/:id`,
    {
      schema: {
        summary: "Delete user",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: SuccessResponseSchema,
          201: CreateResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          403: ForbiddenResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireRoles(["admin"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;
      const { id } = req.params as { id: string };
      const user = await userService.deleteUser(id);
      return reply.status(200).send({
        success: true,
        message: "User deleted",
        data: user,
      });
    },
  );

  app.get(
    `/:id/sync`,
    {
      schema: {
        summary: "Sync user",
        tags: ["Users"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: SuccessResponseSchema,
          201: CreateResponseSchema,
          400: BadRequestResponseSchema,
          401: UnAuthorizedResponseSchema,
          403: ForbiddenResponseSchema,
          408: RequestTimeOutResponseSchema,
          500: InternalServerErrorResponseSchema,
          502: BadGatewayResponseSchema,
        },
      },
      preHandler: [app.requireRoles(["admin", "it_head"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { userService, authService } = req.diScope.cradle;
      const { id } = req.params as { id: string };
      const user = await userService.syncFromAuth(id);
      return reply.status(200).send({
        success: true,
        message: "User synced",
        data: user,
      });
    },
  );
}
