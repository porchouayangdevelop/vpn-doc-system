
import { User, UpdateUser, ListUsers } from "./user.schema";
import { UserRepo, type BankUser, type BankUserList } from "./user.repo";

class UserService {
  private userRepo: UserRepo;
  /**
   * Constructor for UserService class
   * @param {Object} deps - contains the instance of the UserRepo and log
   * @param {UserRepo} deps.userRepo - the instance of the UserRepo class
   * @param {any} deps.log - the logging function
   */
  constructor({ userRepo }: { userRepo: UserRepo }) {
    this.userRepo = userRepo;
  
  }

  /**
   * Creates a new user with the given details and provisions the user in Authentik.
   * If the user with the same employee code or email already exists, a 409 error will be thrown.
   * @param {User} dto - The user details to create.
   * @returns {Promise<BankUser>} - The newly created user.
   * @throws {Error} - If the user with the same employee code or email already exists.
   */
  async createUserWithAuthentik(dto: User): Promise<BankUser> {
    return this.userRepo.createUserWithAuthentik(dto);
  }

  /**
   * Creates a new user with the given details.
   * If the user with the same employee code or email already exists, a 409 error will be thrown.
   * @param {User} dto - The user details to create.
   * @returns {Promise<BankUser>} - The newly created user.
   * @throws {Error} - If the user with the same employee code or email already exists.
   */
  async createUser(dto: User): Promise<BankUser> {
    return this.userRepo.createUser(dto);
  }

  /**
   * Retrieves a user by its ID.
   * @param {string} id The ID of the user to retrieve.
   * @returns {Promise<BankUser | null>} A promise that resolves to a user object or null if the user does not exist.
   */
  async getUserById(id: string): Promise<BankUser | null> {
    return this.userRepo.getUserById(id);
  }

  /**
   * Retrieves a user by its Authentik ID.
   * @param {string} authentikId The Authentik ID of the user to retrieve.
   * @returns {Promise<BankUser | null>} A promise that resolves to a user object or null if the user does not exist.
   */
  async getUserByAuthentikId(authentikId: string): Promise<BankUser | null> {
    return this.userRepo.getUserByAuthentikId(authentikId);
  }

  /**
   * Retrieves a list of users based on the provided query.
   * @param {ListUsers} query The query object containing the parameters to filter the users by.
   * @returns {Promise<BankUserList[] | any[]>} A promise that resolves to an array of user objects or an error object.
   */
  async listUsers(query: ListUsers): Promise<BankUserList[] | any[]> {
    return this.userRepo.listUsers(query);
  }

  /**
   * Updates a user by its ID.
   * @param {string} id The ID of the user to update.
   * @param {UpdateUser} dto The update user object containing the fields to update.
   * @returns {Promise<BankUser>} A promise that resolves to the updated user object.
   * @throws {Error} - If no fields are provided to update.
   * @throws {Error} - If the user does not exist.
   */
  async updateUser(id: string, dto: UpdateUser): Promise<BankUser> {
    return this.userRepo.updateUser(id, dto);
  }

  
  /**
   * Deletes a user by its ID.
   * @param {string} id The ID of the user to delete.
   * @returns {Promise<boolean>} A promise that resolves to true if the user is deleted successfully, or false otherwise.
   */
  async deleteUser(id: string): Promise<boolean> {
    return this.userRepo.deleteUser(id);
  }

  // ── Provision: sync ຈາກ Authentik ────────────────────────
  // ເອີ້ນໂດຍ Gateway ທຸກ request ທີ່ user ∅ ຢູ່ໃນ cache
  async provisionUserByAuthentikId(authentikId: string): Promise<BankUser> {
    return this.userRepo.provisionUserByAuthentikId(authentikId);
  }

  // ── Sync profile: refresh ຈາກ Authentik ─────────────────
  // ເອີ້ນ manual ຫຼື scheduled ເພື່ອ sync role/branch ໃໝ່
  async syncFromAuthentik(userId: string): Promise<BankUser> {
    return this.userRepo.syncFromAuthentik(userId);
  }

  // ── updateLastLogin ───────────────────────────────────────
  async updateLastLogin(userId: string): Promise<void> {
    return this.userRepo.updateLastLogin(userId);
  }

  // ── Provision (auto-create ເມື່ອ first login) ─────────────
  async provisionUser(
    authentikId: string,
    fullName: string,
    email: string,
    employeeCode: string,
  ): Promise<BankUser> {
    return this.userRepo.provisionUser(
      authentikId,
      fullName,
      email,
      employeeCode,
    );
  }
}

export default UserService;
