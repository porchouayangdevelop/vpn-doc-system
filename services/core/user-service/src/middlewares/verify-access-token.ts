import { createRemoteJWKSet, jwtVerify } from "jose";
import { Agent, fetch as undiciFetch } from "undici";

const kcAgent = new Agent({ connect: { rejectUnauthorized: false } });

const JWKS_URL = createRemoteJWKSet(
  new URL(
    `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  ),
  {
    headers: { "User-Agent": "VPNDoc User Service" },
    fetch: undiciFetch,
    dispatcher: kcAgent,
  } as any,
);

export async function verifyAccessToken(token: string) {
  const { payload, protectedHeader } = await jwtVerify(token, JWKS_URL, {
    issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    audience: process.env.KEYCLOAK_CLIENT_ID!,
  });

  return payload;
}
