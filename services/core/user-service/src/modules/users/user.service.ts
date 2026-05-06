
import { User, UpdateUser, ListUsers, CreateUserWithKeycloakDto } from "./user.schema";
import { UserRepo, type BankUser, type BankUserList } from "./user.repo";
import { type Static } from "@sinclair/typebox";

class UserService {
  private userRepo: UserRepo;

  constructor({ userRepo }: { userRepo: UserRepo }) {
    this.userRepo = userRepo;
  }

  async createUserWithKeycloak(dto: Static<typeof CreateUserWithKeycloakDto>): Promise<BankUser> {
    return this.userRepo.createUserWithKeycloak(dto);
  }

  async createUser(dto: User): Promise<BankUser> {
    return this.userRepo.createUser(dto);
  }

  async getUserById(id: string): Promise<BankUser | null> {
    return this.userRepo.getUserById(id);
  }

  async getUserByKeycloakId(keycloakId: string): Promise<BankUser | null> {
    return this.userRepo.getUserByKeycloakId(keycloakId);
  }

  async listUsers(query: ListUsers): Promise<BankUserList[] | any[]> {
    return this.userRepo.listUsers(query);
  }

  async updateUser(id: string, dto: UpdateUser): Promise<BankUser> {
    return this.userRepo.updateUser(id, dto);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepo.deleteUser(id);
  }

  async provisionUserByKeycloakId(keycloakId: string): Promise<BankUser> {
    return this.userRepo.provisionUserByKeycloakId(keycloakId);
  }

  async syncFromAuth(userId: string): Promise<BankUser> {
    return this.userRepo.syncFromAuth(userId);
  }

  async updateLastLogin(userId: string): Promise<void> {
    return this.userRepo.updateLastLogin(userId);
  }

  async provisionUser(
    keycloakId: string,
    fullName: string,
    email: string,
    employeeCode: string,
  ): Promise<BankUser> {
    return this.userRepo.provisionUser(keycloakId, fullName, email, employeeCode);
  }
}

export default UserService;
