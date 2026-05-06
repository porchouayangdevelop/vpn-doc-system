import { AuthRepo } from "./auth.repo";
import { LoginDto, LoginResponse, AuthTokens } from "./auth.schema";
import { type BankUser } from "../users/user.repo";

class AuthService {
  private authRepo: AuthRepo;

  constructor({ authRepo }: { authRepo: AuthRepo }) {
    this.authRepo = authRepo;
  }

  async signin(dto: LoginDto): Promise<LoginResponse> {
    return this.authRepo.signin(dto);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.authRepo.refreshToken(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    return this.authRepo.logout(refreshToken);
  }

  async getMe(userId: string, keycloakId: string): Promise<BankUser> {
    return this.authRepo.getMe(userId, keycloakId);
  }

  async tokenExchange(keycloakId: string): Promise<{
    user: BankUser;
    bankUserId: string;
  }> {
    return this.authRepo.tokenExchange(keycloakId);
  }
}

export default AuthService;
