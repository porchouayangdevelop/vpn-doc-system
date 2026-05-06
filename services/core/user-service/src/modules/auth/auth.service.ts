import { AuthRepo } from "./auth.repo";
import {
  LoginDto,
  LoginResponse,
  AuthTokenResponse,
  AuthTokens,
  AuthTokenResponseSchema ,
} from "./auth.schema";

import { type BankUser } from "../users/user.repo";

class AuthService {
  private authRepo: AuthRepo;
  private readonly tokenUrl:string = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`;
  private readonly logoutUrl:string = `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`;
  constructor({ authRepo }: { authRepo: AuthRepo }) {
    this.authRepo = authRepo;
  }

  async callKcToken(body:Record<string,string>): Promise<AuthTokenResponse> {
    const params = new URLSearchParams({
      client_id: process.env.KEYCLOAK_CLIENT_ID! || "",
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET! || "",
      ...body,
    });

    const res = await fetch(this.tokenUrl,{
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(5000), // Set a timeout of 5 seconds
    });
    const data = await res.json() as AuthTokenResponse;

    if(!res.ok || data.error) {
      throw new Error(data.error || "Failed to obtain authentication token");
    }
    return data;
  }

  async extractSub(accessToken: string): Promise<string> {
    const payload = JSON.parse(Buffer.from(accessToken.split(".")[1]!, "base64url").toString()) as { sub: string };
    if (!payload.sub) {
      throw new Error("Invalid access token: 'sub' claim is missing");
    }
    return payload.sub;
  }

  async signin(dto: LoginDto): Promise<LoginResponse> {
    const tokens = await this.callKcToken({
      grant_type: "password",
      username: dto.username,
      password: dto.password,
      scope: "openid profile email",
    });

    const kcId = this.extractSub(tokens.access_token);

    
  }

  async getMe(userId: string, authentikId: string): Promise<BankUser> {
    return this.authRepo.getMe(userId, authentikId);
  }

  async tokenExchange(authentikId: string): Promise<{
    user: BankUser;
    bankUserId: string;
  }> {
    return this.authRepo.tokenExchange(authentikId);
  }
}

export default AuthService;
