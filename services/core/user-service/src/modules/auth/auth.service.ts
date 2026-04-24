import { AuthRepo } from "./auth.repo";
import {
  LoginDto,
  LoginResponse,
  AuthenTokens,
  AuthentikResponse,
} from "./auth.schema";

import { type BankUser } from "../users/user.repo";

class AuthService {
  private authRepo: AuthRepo;
  constructor({ authRepo }: { authRepo: AuthRepo }) {
    this.authRepo = authRepo;
  }
  async callAuthentikToken(
    body: Record<string, string>,
  ): Promise<AuthentikResponse> {
    return this.authRepo.callAuthentikToken(body);
  }

  async extractSub(accessToken: string): Promise<string> {
    return this.authRepo.extractSub(accessToken);
  }

  async signin(dto: LoginDto): Promise<LoginResponse> {
    return this.authRepo.signin(dto);
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
