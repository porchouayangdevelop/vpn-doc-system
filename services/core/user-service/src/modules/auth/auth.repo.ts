import { JsonTypeBuilder, Type, type Static } from "@sinclair/typebox";
import UserService from "../users/user.service";
import { type BankUser } from "../users/user.repo";
import {
  LoginDto,
  LoginResponse,
  AuthTokens,
  AuthTokenResponse,  AuthTokenResponseSchema,
} from "./auth.schema";
import { log } from "console";

import { Agent, Dispatcher } from "undici";
import fs from "node:fs";
import https from "https";
import axios, { AxiosError } from "axios";

const rootCa = fs.readFileSync(
  process.cwd() +
    "/certs/" +
    "authentik Self-signed Certificate_certificate.pem",
  "utf-8",
);

export const AuthentikUserInfo = Type.Object({
  sub: Type.String(),
  email: Type.String(),
  name: Type.String(),
  preferred_username: Type.String(),
  email_verified: Type.Boolean(),
  employee_code: Type.Optional(Type.String()),
  branch_id: Type.Optional(Type.String()),
  department_id: Type.Optional(Type.String()),
  role: Type.Optional(Type.String()),
  iss: Type.String(),
  aud: Type.String(),
  exp: Type.Number(),
  iat: Type.Number(),
});

export const GetDeDto = Type.Object({
  userId: Type.String(),
  authentikId: Type.String(),
});

export type AuthentikUserInfo = Static<typeof AuthentikUserInfo>;
export type GetDeDto = Static<typeof GetDeDto>;

export class AuthRepo {
  private headers: object;
  private userService: UserService;
  constructor({ userService }: { userService: UserService }) {
    this.userService = userService;
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }
  private timeout() {
    return AbortSignal.timeout(10_000);
  }

  async callAuthentikToken(
    body: Record<string, string>,
  ): Promise<AuthTokenResponse> {
    try {
      // const res = await fetch(`${process.env.AUTHENTIK_TOKEN_URL}`, {
      //   dispatcher: agent,
      //   method: "POST",
      //   headers: this.headers,
      //   body: new URLSearchParams({
      //     client_id: process.env.AUTHENTIK_CLIENT_ID!,
      //     client_secret: process.env.AUTHENTIK_CLIENT_SECRET!,
      //     // grant_type: "client_credentials",
      //     ...body,
      //   }).toString(),

      //   signal: this.timeout(),
      // });

      const params = new URLSearchParams();

      params.append("client_id", process.env.AUTHENTIK_CLIENT_ID!);
      params.append("client_secret", process.env.AUTHENTIK_CLIENT_SECRET!);
      params.append("scope", "openid profile email groups");
      // params.append("scope", "openid profile email");


      for (const [key, value] of Object.entries(body)) {
        params.append(key, value);
      }

      const res = await axios.post(
        `${process.env.AUTHENTIK_TOKEN_URL}`,
        params.toString(),
        {
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
          }),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
          validateStatus: (status) => true, // Accept all status codes, we'll handle errors manually
        },
      );

      log(res.data);

      const data = res.data as AuthTokenResponse;
      if (res.status >= 400 || res.data.error) {
        const msg =
          data.error_description ?? data.error ?? "Authentication failed";
        log("Authentik token endpoint error: ", {
          status: res.status,
          response: data.error,
          error: data.error_description,
          sentGrantType: params.get("grant_type"),
        });

        throw {
          statusCode: 401,
          message: msg,
        };
      }
      return data;
    } catch (error: any) {
      log("Error calling Authentik token endpoint: ", {
        error: error instanceof AxiosError ? error.toJSON() : error,
        message: error.message,
      });
      throw {
        statusCode: 500,
        message: "Failed to call Authentik token endpoint",
      };
    }
  }

  async extractSub(accessToken: string): Promise<string> {
    const parts = accessToken.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf-8"),
    ) as { sub?: string };

    if (!payload.sub)
      throw {
        statusCode: 401,
        message: "Invalid token: no sub",
      };
    return payload.sub;
  }

  async signin(dto: LoginDto): Promise<LoginResponse> {
    console.log({ username: dto.username }, "Signing in...");

    const tokens = await this.callAuthentikToken({
      grant_type: "password",
      username: dto.username,
      password: dto.password,
      // scope: "openid profile email",
    });

    const authentikId = await this.extractSub(tokens.access_token);
    console.log(
      {
        authentikId,
      },
      `Login token issued by Authentik: (${authentikId})`,
    );

    const user = await this.userService.provisionUserByAuthentikId(authentikId);

    if (!user.is_active) {
      throw {
        statusCode: 403,
        message: "User is inactive. Please contact admin.",
      };
    }

    await this.userService.updateLastLogin(user.id);

    log(
      {
        userId: user.id,
        role: user.role,
      },
      "User logged in",
    );

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      ...user,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    log({ refreshToken }, "Refresh token called");

    const token = await this.callAuthentikToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "openid profile email",
    });

    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type,
      expires_in: token.expires_in,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    log(`Logout: revoking token ${refreshToken} at Authentik`);

    try {
      const body = new URLSearchParams({
        client_id: process.env.AUTHENKTIK_CLIENT_ID!,
        client_secret: process.env.AUTHENTIK_CLIENT_SECRET!,
        token: refreshToken,
        token_type_hint: "refresh_token",
      }).toString();

      await fetch(`${process.env.AUTHENTIK_REVOKE_URL!}`, {
        method: "POST",
        headers: this.headers,
        body: body,
        signal: this.timeout(),
      });
    } catch (error) {
      throw new Error(`Failed to revoke token: ${error}`);
    }
  }

  async getMe(userId: string, authentikId: string): Promise<BankUser> {
    let user = await this.userService.getUserById(userId);
    if (!user && authentikId) {
      user = await this.userService.provisionUserByAuthentikId(authentikId);
    }

    if (!user)
      throw {
        statusCode: 404,
        message: "User not found. Please contact admin.",
      };

    if (!user.is_active)
      throw {
        statusCode: 403,
        message: "User is inactive. Please contact admin.",
      };

    await this.userService.updateLastLogin(user.id);

    return user;
  }

  async tokenExchange(authentikId: string): Promise<{
    user: BankUser;
    bankUserId: string;
  }> {
    const user = await this.userService.provisionUserByAuthentikId(authentikId);
    return {
      user,
      bankUserId: user.id,
    };
  }
}


// curl -X POST "https://por.auth.local/application/o/token/" \
//   -H "Content-Type: application/x-www-form-urlencoded" \
//   --data-urlencode "grant_type=password" \
//   --data-urlencode "client_id=dCpbd8zsWbERpSsMnchADrVYbaikVDd6213kuPZd" \
//   --data-urlencode "client_secret=VfYyJkhW5qKVII288trjFZxhXjOT6EpliTs8NuGppckI3m5VIv9uQ4yyeG3daIJgwazJaWdm9em86956zD4bhye1sM7EhbYZ2pu1yOKionDS9UQUZB1RDgn8d7ZfNLBx" \
//   --data-urlencode "username=porchouayang@pordev.pro" \
//   --data-urlencode "password=Por@2026" \
//   --data-urlencode "scope=openid profile email" \
//   -k