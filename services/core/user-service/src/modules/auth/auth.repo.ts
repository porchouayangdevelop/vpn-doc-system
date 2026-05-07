import axios from "axios";
import https from "https";
import UserService from "../users/user.service";
import { type BankUser } from "../users/user.repo";
import {
  LoginDto,
  LoginResponse,
  AuthTokens,
  AuthTokenResponse,
} from "./auth.schema";
import { keycloakClient } from "@/lib/keycloak-client";

const kcHttp = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  timeout: 10_000,
});

export class AuthRepo {
  private readonly tokenUrl: string;
  private readonly logoutUrl: string;
  private userService: UserService;

  constructor({ userService }: { userService: UserService }) {
    this.userService = userService;
    this.tokenUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
    this.logoutUrl = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
  }

  async callKcToken(body: Record<string, string>): Promise<AuthTokenResponse> {
    const params = new URLSearchParams({
      client_id: process.env.KEYCLOAK_CLIENT_ID!,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      ...body,
    });

    const res = await kcHttp.post<AuthTokenResponse>(
      this.tokenUrl,
      params.toString(),
      { validateStatus: () => true },
    );

    const data = res.data;

    if (res.status >= 400 || data.error) {
      throw {
        statusCode: 401,
        message:
          data.error_description ?? data.error ?? "Authentication failed",
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
      throw { statusCode: 401, message: "Invalid token: no sub" };
    return payload.sub;
  }

  async signin(dto: LoginDto): Promise<LoginResponse> {
    const tokens = await this.callKcToken({
      grant_type: "password",
      username: dto.username,
      password: dto.password,
      scope: "openid profile email",
    });

    const keycloakId = await this.extractSub(tokens.access_token);

    const user = await this.userService.provisionUserByKeycloakId(keycloakId);

    if (!user.is_active) {
      throw {
        statusCode: 403,
        message: "User is inactive. Please contact admin.",
      };
    }

    await this.userService.updateLastLogin(user.id!);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      ...user,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const token = await this.callKcToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type,
      expires_in: token.expires_in,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const params = new URLSearchParams({
      client_id: process.env.KEYCLOAK_CLIENT_ID!,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      refresh_token: refreshToken,
    });

    await kcHttp.post(this.logoutUrl, params.toString(), {
      validateStatus: () => true,
    });
  }

  async getMe(userId: string, keycloakId: string): Promise<BankUser> {
    let user = await this.userService.getUserById(userId);
    if (!user && keycloakId) {
      user = await this.userService.provisionUserByKeycloakId(keycloakId);
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

    await this.userService.updateLastLogin(user.id!);

    console.log(user);
    
    return user;
  }

  async tokenExchange(keycloakId: string): Promise<{
    user: BankUser;
    bankUserId: string;
  }> {
    const user = await this.userService.provisionUserByKeycloakId(keycloakId);
    return { user, bankUserId: user.id! };
  }

  async forgotPassword(email: string): Promise<void> {
    const kcUser = await keycloakClient.getUserByEmail(email);
    if (!kcUser) throw { statusCode: 404, message: "User not found" };
    await keycloakClient.sendForgotPasswordEmail(kcUser.id);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userService.getUserById(userId);
    if (!user?.keycloak_id)
      throw { statusCode: 404, message: "User not found" };
    await keycloakClient.resetPassword(user.keycloak_id, newPassword);
  }

  async changePassword(
    keycloakId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const kcUser = await keycloakClient.getUserById(keycloakId);
    if (!kcUser) throw { statusCode: 404, message: "User not found" };

    try {
      await this.callKcToken({
        grant_type: "password",
        username: kcUser.username,
        password: currentPassword,
      });
    } catch {
      throw { statusCode: 401, message: "Current password is incorrect" };
    }

    await keycloakClient.resetPassword(keycloakId, newPassword);
  }
}
