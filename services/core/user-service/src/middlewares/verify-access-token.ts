import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS_URL = createRemoteJWKSet(
  new URL(`${process.env.AUTHENTIK_ISSUER_URL!}/aplication/o/jwks/`),
);

export async function verifyAccessToken(token: string) {
  const { payload, protectedHeader } = await jwtVerify(token, JWKS_URL, {
    issuer: process.env.AUTHENTIK_ISSUER_URL!,
    audience: process.env.AUTHENTIK_CLIENT_ID!,
  });

  return payload;
}
