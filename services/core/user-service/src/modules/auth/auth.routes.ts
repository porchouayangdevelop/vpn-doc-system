import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { LoginDto, LoginResponse } from "./auth.schema";
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
          200: LoginResponse,
        },
      },
      preHandler: [app.requireAuth],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
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

  app.post(
    "/signin",
    {
      schema: {
        summary: "Signin",
        tags: ["Auth"],
        description: `[
          'ເຂົ້າສູ່ລະບົບດ້ວຍ email + password.',
        '',
        '**Flow:**',
        '1. ສົ່ງ credentials ໄປ Authentik (ROPC grant)',
        '2. Authentik ກວດ + ອອກ access_token / refresh_token',
        '3. Provision bank profile (ຖ້າ first login)',
        '4. ຄືນ tokens + user profile',
        '',
        '> ⚠️ ROPC ຕ້ອງ enable ໃນ Authentik Provider settings',
      ]`,
        security: [],
        body: LoginDto,
        response: {
          200: LoginResponse,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const { username, password } = req.body as {
        username: string;
        password: string;
      };

      const user = await authService.signin({ username: username, password });
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
