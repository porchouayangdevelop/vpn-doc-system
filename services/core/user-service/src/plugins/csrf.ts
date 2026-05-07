import fp from "fastify-plugin";
import csrf from "@fastify/csrf-protection";
import { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
  await app.register(csrf, {
    sessionPlugin: "@fastify/secure-session",
    cookieOpts: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      signed: true,
    },
  });
});
