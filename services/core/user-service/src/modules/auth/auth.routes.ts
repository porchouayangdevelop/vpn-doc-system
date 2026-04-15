import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import AuthService from "../auth/auth.service";
import { Type } from "@sinclair/typebox";
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
export default async function authRoute(app: FastifyInstance) {
  let authService = new AuthService(app);
  //get me
  app.get(
    "/me",
    {
      schema: {
        summary: "Get me",
        tags: ["Auth"],
        security: [
          {
            bearerAuth: [],
          },
        ],
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
}
