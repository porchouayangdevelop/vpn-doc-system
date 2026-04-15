import type { FastifyInstance } from "fastify";
import type { BankUser } from "../users/user.service";
import UserService from "../users/user.service";
import { type BankRole } from "@vpndoc/shared-types";
import * as jose from "jose";
import {
  LoginDto,
  LoginResponse,
  AuthenTokens,
  AuthentikResponse,
} from "./auth.schema";

interface AuthentikUserInfo {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  email_verified: boolean;
  employee_code?: string;
  branch_id?: string;
  department_id?: string;
  role?: BankRole;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
}

interface GetMeDto {
  userId: string;
  authentikId: string;
}

class AuthService {
  private app: FastifyInstance;
  private readonly userService: any;
  private headers: object;
  constructor(app: FastifyInstance) {
    this.app = app;
    this.userService = new UserService(app);
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  timeout() {
    return AbortSignal.timeout(10_000);
  }

  async callAuthentikToken(
    body: Record<string, string>,
  ): Promise<AuthentikResponse> {
    const res = await fetch(`${this.app.config.AUTHENTIK_API_TOKEN!}`, {
      method: "POST",
      headers: this.headers,
      body: new URLSearchParams({
        client_id: this.app.config.AUTHENKTIK_CLIENT_ID!,
        client_secret: this.app.config.AUTHENTIK_CLIENT_SECRET!,
        grant_type: "client_credentials",
        ...body,
      }).toString(),
      signal: this.timeout(),
    });

    const data = (await res.json()) as AuthentikResponse;
    if (!res.ok || data.error) {
      const msg =
        data.error_description ?? data.error ?? "Authentication failed";
      throw {
        statusCode: 401,
        message: msg,
      };
    }
    return data;
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

  async signin(dto:LoginDto):Promise<LoginResponse>{
    this.app.log.info({ email: dto.email }, "Signing in...");

    const tokens = await this.callAuthentikToken({
      grant_type: "password",
      username: dto.email,
      password: dto.password,
      scope: "openid profile email",
    });

    const authentikId = this.extractSub(tokens.access_token); 
    this.app.log.info({
      authentikId
    },`Login token issued by Authentik: (${authentikId})`);

    const user = await this.userService.provisionUserByAuthentikId(authentikId);

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

export default AuthService;
