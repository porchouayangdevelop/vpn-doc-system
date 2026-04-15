import fp from "fastify-plugin";
import * as jose from "jose";
import type { FastifyInstance } from "fastify";

const JWKS_CACHE_KEY = "gateway:jwks";
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

declare module "fastify" {
  interface FastifyInstance {
    verifyToken: (token: string) => Promise<jose.JWTPayload>;
  }
}

export default fp(async (app: FastifyInstance) => {
  const jwksUrl = app.config.AUTHENTIK_JWKS_URL!;

  async function getKeySet(): Promise<jose.JSONWebKeySet> {
    const cached = await app.redis.get(JWKS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as jose.JSONWebKeySet;
    }

    app.log.debug("fetching JWKS from Authentik");
    const res = await fetch(jwksUrl, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok)
      throw new Error(`Failed to fetch JWKS from Authentik : ${res.status}`);
    const jwks = (await res.json()) as jose.JSONWebKeySet;
    await app.redis.set(JWKS_CACHE_KEY, JWKS_CACHE_TTL, () => {
      return JSON.stringify(jwks);
    });
    return jwks;
  }

  app.decorate("verifyToken", async (token: string) => {
    const jwks = await getKeySet();
    const keySet = jose.createLocalJWKSet(jwks);
    const { payload } = await jose.jwtVerify(token, keySet, {
      issuer: app.config.AUTHENTIK_ISSUER,
    });

    return payload;
  });
},{
  name:'jwks',
});
