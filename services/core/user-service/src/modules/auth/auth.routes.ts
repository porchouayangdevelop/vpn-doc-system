import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from "fastify";
import { Type } from "@sinclair/typebox";
import {
  LoginDto,
  LoginResponse,
  AuthTokens,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  Auth200Schema,
  Auth400Schema,
  Auth401Schema,
  Auth403Schema,
  Auth500Schema,
} from "./auth.schema";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export default async function authRoute(app: FastifyInstance) {
  // GET /me
  app.get(
    "/me",
    {
      // schema: {
      //   summary: "Get me",
      //   tags: ["Auth"],
      //   security: [{ bearerAuth: [
          
      //   ] }],
      //   response: {
      //     200: LoginResponse,
      //     401: Auth401Schema,
      //     403: Auth403Schema,
      //     500: Auth500Schema,
      //   },
      // },
      // preHandler: [app.requireAuth],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const user = await authService.getMe(
        req.userCtx.userId,
        req.userCtx.keycloakId,
      );
      return reply
        .status(200)
        .send({ success: true, message: "User found", data: user });
    },
  );

  // POST /signin
  app.post(
    "/signin",
    {
      schema: {
        summary: "Signin",
        tags: ["Auth"],
        security: [],
        body: LoginDto,
        response: {
          200: Auth200Schema,
          400: Auth400Schema,
          401: Auth401Schema,
          403: Auth403Schema,
          500: Auth500Schema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      try {
        const { username, password } = req.body as {
          username: string;
          password: string;
        };

        const user = await authService.signin({ username, password });

        reply
          .setCookie("access_token", user.access_token, {
            ...COOKIE_OPTS,
            maxAge: user.expires_in,
          })
          .setCookie("refresh_token", user.refresh_token, {
            ...COOKIE_OPTS,
            maxAge: 30 * 24 * 60 * 60,
          });

        return reply
          .status(200)
          .send({ success: true, message: "Signin successful", data: user });
      } catch (error: any) {
        return reply
          .status(error.statusCode || 500)
          .send({
            success: false,
            error: error.message,
            message: error.message || "Signin failed",
          });
      }
    },
  );

  // POST /refresh
  app.post(
    "/refresh",
    {
      schema: {
        summary: "Refresh token",
        tags: ["Auth"],
        security: [],
        body: RefreshTokenDto,
        response: {
          200: AuthTokens,
          400: Auth400Schema,
          401: Auth401Schema,
          500: Auth500Schema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const { refresh_token } = req.body as { refresh_token: string };

      const tokens = await authService.refreshToken(refresh_token);

      reply
        .setCookie("access_token", tokens.access_token, {
          ...COOKIE_OPTS,
          maxAge: tokens.expires_in,
        })
        .setCookie("refresh_token", tokens.refresh_token, {
          ...COOKIE_OPTS,
          maxAge: 30 * 24 * 60 * 60,
        });

      return reply
        .status(200)
        .send({ success: true, message: "Token refreshed", data: tokens });
    },
  );

  // POST /logout
  app.post(
    "/logout",
    {
      schema: {
        summary: "Logout",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        body: RefreshTokenDto,
        response: {
          200: Auth200Schema,
          400: Auth400Schema,
          401: Auth401Schema,
          500: Auth500Schema,
        },
      },
      preHandler: [app.requireAuth],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const { refresh_token } = req.body as { refresh_token: string };

      await authService.logout(refresh_token);

      reply
        .clearCookie("access_token", { path: "/" })
        .clearCookie("refresh_token", { path: "/" });

      return reply
        .status(200)
        .send({ success: true, message: "Logged out successfully" });
    },
  );

  // POST /forgot-password
  app.post(
    "/forgot-password",
    {
      schema: {
        summary: "Forgot password — sends reset email via Keycloak",
        tags: ["Auth"],
        security: [],
        body: ForgotPasswordDto,
        response: {
          200: Auth200Schema,
          400: Auth400Schema,
          404: Auth400Schema,
          500: Auth500Schema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const { email } = req.body as { email: string };

      await authService.forgotPassword(email);

      return reply.status(200).send({
        success: true,
        message: "Password reset email sent if account exists",
      });
    },
  );

  // PUT /reset-password/:id  (admin only — resets another user's password)
  app.put(
    "/reset-password/:id",
    {
      schema: {
        summary: "Reset password (admin)",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String() }),
        body: ResetPasswordDto,
        response: {
          200: Auth200Schema,
          400: Auth400Schema,
          401: Auth401Schema,
          403: Auth403Schema,
          404: Auth400Schema,
          500: Auth500Schema,
        },
      },
      preHandler: [app.requireRoles(["admin"])],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const { id } = req.params as { id: string };
      const { newPassword } = req.body as { newPassword: string };

      await authService.resetPassword(id, newPassword);

      return reply
        .status(200)
        .send({ success: true, message: "Password reset successfully" });
    },
  );

  // PUT /change-password  (user changes own password)
  app.put(
    "/change-password",
    {
      schema: {
        summary: "Change password",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        body: ChangePasswordDto,
        response: {
          200: Auth200Schema,
          400: Auth400Schema,
          401: Auth401Schema,
          500: Auth500Schema,
        },
      },
      preHandler: [app.requireAuth],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { authService } = req.diScope.cradle;
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };

      await authService.changePassword(
        req.userCtx.keycloakId,
        currentPassword,
        newPassword,
      );

      return reply
        .status(200)
        .send({ success: true, message: "Password changed successfully" });
    },
  );
}
