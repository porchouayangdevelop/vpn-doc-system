import { Pool } from "mariadb";
import { User, UpdateUser, ListUsers } from "./user.schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { Type, type Static } from "@sinclair/typebox";
import { Db } from "@/plugins/db";
import { keycloakClient } from "@/lib/keycloak-client";
import { mapKcUser } from "@/lib/keycloak-mapper";

export const BankUser = Type.Object({
  id: Type.String(),
  keycloak_id: Type.String(),
  // keycloak_pk: Type.Number(),
  employee_code: Type.String(),
  full_name: Type.String(),
  email: Type.String(),
  role: Type.String(),
  branch_id: Type.String(),
  department_id: Type.Optional(Type.String()),
  is_active: Type.Boolean(),
  last_login_at: Type.Optional(Type.String()),
  password_hash: Type.Optional(Type.String()),
  created_at: Type.String(),
  updated_at: Type.String(),
});

export const BankUserList = Type.Object({
  items: Type.Array(BankUser),
  page: Type.Number(),
  limit: Type.Number(),
  total: Type.Number(),
  totalPages: Type.Number(),
});

export type BankUser = Static<typeof BankUser>;
export type BankUserList = Static<typeof BankUserList>;

interface Dependencies {
  pool: Pool;
}

export class UserRepo {
  private log: any;
  /**
   * Constructor for UserRepo class
   * @param {Dependencies} deps - contains the instance of the database
   * @param {Object} log - contains the logging function
   */
  constructor(
    private deps: { db: Db },
    log: any,
  ) {
    this.log = log;
  }

  private get db() {
    return this.deps.db;
  }

  // ── Create user + Authentik account (admin) ───────────────
  // Admin ສ້າງ user ໂດຍ:
  //   1. ສ້າງ account ໃນ Authentik API
  //   2. Assign ໄປ group ຕາມ role
  //   3. ສ້າງ bank profile ໃນ DB
  async createUserWithKeycloak(dto: User): Promise<BankUser> {
    const exists = await this.db.query<BankUser[]>(
      `SELECT id FROM users WHERE employee_code = ? or email = ?`,
      [dto.employee_code, dto.email],
    );
    if (exists.length > 0) {
      throw {
        statusCode: 409,
        message: "User with the same employee code or email already exists",
      };
    }

    this.log.info({ email: dto.email }, "Creating user in Keycloak...");

    const keycloakUser = await keycloakClient.createUser({
      username:dto.
      
    });

    this.log.info({ keycloakId: keycloakUser }, "User created in Keycloak");

    const ROLE_GROUP_MAP: Record<string, string> = {
      maker: "bank-makers",
      unit_head: "bank-unit-heads",
      branch: "bank-branch",
      department: "bank-department",
      it_head: "bank-it-heads",
      it_po: "bank-it-po",
      it_staff: "bank-it-staff",
      admin: "bank-admins",
    };

    const groupName = ROLE_GROUP_MAP[dto.role];
    if (groupName) {
      const assigned = await keycloakClient.addUserToGroup(
        keycloakUser.id,
        groupName,
      );

      if (!assigned) {
        this.log.warn(
          { groupName },
          "Failed to assign user to group in Keycloak",
        );
        throw {
          statusCode: 500,
          message: "Failed to assign user to group in Authentik",
        };
      }
    }

    const id = randomUUID();
    await this.db.query(
      `INSERT INTO users (id, keycloak_id, employee_code, full_name, email, role, branch_id, department_id, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        keycloakUser.id,
        dto.employee_code,
        dto.full_name,
        dto.email,
        dto.role,
        dto.branch_id,
        dto.department_id ?? null,
        true,
      ],
    );
    this.log.info({ id }, "User created in both Keycloak and DB");

    return (await this.getUserById(id))!;
  }

  /**
   * Creates a new user with the given details.
   * If the user with the same employee code or email already exists, a 409 error will be thrown.
   * @param {User} dto - The user details to create.
   * @returns {Promise<BankUser>} - The newly created user.
   * @throws {Error} - If the user with the same employee code or email already exists.
   */
  async createUser(dto: User): Promise<BankUser> {
    const exists = await this.db.query<BankUser[]>(
      `SELECT id FROM users WHERE employee_code = ? or email = ?`,
      [dto.employee_code, dto.email],
    );

    if (exists.length > 0) {
      throw {
        statusCode: 409,
        message: "User with the same employee code or email already exists",
      };
    }

    const id = randomUUID();
    const hash = dto.password ? await bcrypt.hash(dto.password, 12) : null;

    await this.db.query(
      `INSERT INTO users (id, authentik_id, employee_code, full_name, email, role, branch_id, department_id, is_active, password_hash) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        "",
        dto.employee_code,
        dto.full_name,
        dto.email,
        dto.role,
        dto.branch_id,
        dto.department_id ?? null,
        true,
        hash,
      ],
    );

    const user = await this.getUserById(id);
    if (!user) {
      throw {
        statusCode: 500,
        message: "Failed to retrieve created user",
      };
    }
    return user;
  }

  /**
   * Retrieves a user by its ID.
   * @param {string} id The ID of the user to retrieve.
   * @returns {Promise<BankUser | null>} A promise that resolves to a user object or null if the user does not exist.
   */
  async getUserById(id: string): Promise<BankUser | null> {
    const rows = await this.db.query(
      `SELECT 
        id, keycloak_id, employee_code, full_name, email, role, branch_id, department_id, is_active, last_login_at, created_at, updated_at   
        FROM users WHERE id = ?`,
      [id],
    );

    return rows[0] ?? null;
  }

  async getUserByKeycloakId(keycloakId: string): Promise<BankUser | null> {
    const rows = await this.db.query(
      `SELECT 
        id, keycloak_id, employee_code, full_name, email, role, branch_id, department_id, is_active, last_login_at, created_at, updated_at   
        FROM users WHERE keycloak_id = ? and is_active = 1`,
      [keycloakId],
    );

    return rows[0] ?? null;
  }

  /**
   * Retrieves a list of users based on the provided query.
   * @param {ListUsers} query The query object containing the parameters to filter the users by.
   * @returns {Promise<ListUsers[] | any[]>} A promise that resolves to an array of user objects or an error object.
   */
  async listUsers(query: ListUsers): Promise<ListUsers[] | any[]> {
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (query.role) {
      where.push(`role = ?`);
      params.push(query.role);
    }
    if (query.branch_id) {
      where.push(`branch_id = ?`);
      params.push(query.branch_id);
    }

    if (query.search) {
      where.push(`(employee_code LIKE ? OR full_name LIKE ? OR email LIKE ?)`);
      params.push(`%${query.search}%`);
      params.push(`%${query.search}%`);
      params.push(`%${query.search}%`);
    }

    const page = query.page ?? 1;
    const offset = Number(page - 1) * Number(query.limit);

    const [rows, countRows] = await Promise.all([
      this.db.query<BankUser[]>(
        `SELECT 
          id, keycloak_id, employee_code, full_name, email, role, branch_id, department_id, is_active, last_login_at, created_at, updated_at
          FROM users WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, query.limit, offset],
      ),
      this.db.query<[{ total: bigint }]>(
        `SELECT COUNT(*) as total FROM users WHERE ${where.join(" AND ")}`,
        params,
      ),
    ]);

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / Number(query.limit));
    return [
      {
        items: rows,
        page,
        limit: Number(query.limit),
        total,
        totalPages,
      },
    ];
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
    const sets: string[] = [];
    const params: unknown[] = [];

    if (dto.full_name !== undefined || !dto.full_name) {
      sets.push(`full_name = ?`);
      params.push(dto.full_name);
    }
    if (dto.email !== undefined || !dto.email) {
      sets.push(`email = ?`);
      params.push(dto.email);
    }
    if (dto.role !== undefined || !dto.role) {
      sets.push(`role = ?`);
      params.push(dto.role);
    }
    if (dto.branch_id !== undefined || !dto.branch_id) {
      sets.push(`branch_id = ?`);
      params.push(dto.branch_id);
    }
    if (dto.department_id !== undefined || !dto.department_id) {
      sets.push(`department_id = ?`);
      params.push(dto.department_id);
    }
    if (dto.is_active !== undefined || !dto.is_active) {
      sets.push(`is_active = ?`);
      params.push(dto.is_active);
    }

    if (sets.length === 0)
      throw {
        statusCode: 400,
        message: "No fields to update",
      };

    params.push(id);
    await this.db.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );

    const user = await this.getUserById(id);
    if (!user) {
      throw {
        statusCode: 404,
        message: "User not found",
      };
    }
    return user;
  }

  // delete user by admin
  async deleteUser(id: string): Promise<boolean> {
    //find user on other active or used
    const user = await this.getUserById(id);
    if (!user) return false;
    await this.db.query(`UPDATE users SET is_active = 0 WHERE id = ?`, [id]);
    return true;
  }

  // ── Provision: sync ຈາກ Keycloak ────────────────────────
  // ເອີ້ນໂດຍ Gateway ທຸກ request ທີ່ user ∅ ຢູ່ໃນ cache
  async provisionUserByKeycloakId(keycloakId: string): Promise<BankUser> {
    // check by keycloak_id from db
    const exists = await this.getUserByKeycloakId(keycloakId);
    if (exists) {
      this.log.info({ keycloakId }, "User already exists");
      return exists;
    }

    //check keycloak api
    this.log.info({ keycloakId }, "Fetching user from keycloak api...");
    const keycloakUser = await keycloakClient.getUserById(keycloakId);
    if (!keycloakUser) {
      throw {
        statusCode: 404,
        message: `User ${keycloakId} not found in Keycloak`,
      };
    }

    this.log.info(
      {
        keycloakId,
        email: keycloakUser.email,
        realm: keycloakUser.realmRoles,
      },
      "Keycloak user fetched",
    );

    // ── 3. Map Keycloak data → bank profile ────────────────
    const profile = mapKcUser(keycloakUser);

    this.log.info(
      {
        email: keycloakUser.email,
        role: profile.role,
        branch: profile.branchId,
        department: profile.departmentId,
        employeeCode: profile.employeeCode,
      },
      "Keycloak user mapped to bank profile",
    );

    // ── 4. ກວດ by email (user ຖືກສ້າງ manual ໄວ້ before) ────
    const byEmail = await this.db.query<BankUser[]>(
      `SELECT * FROM users WHERE email = ?`,
      [keycloakUser.email],
    );

    if (byEmail[0]) {
      await this.db.query(
        `
            UPDATE users SET
              keycloak_id  = ?, 
             keycloak_pk  = ?,
             full_name     = ?,
             role = case when role ='maker' then ? else role end,
              branch_id     = CASE WHEN branch_id = '' OR branch_id IS NULL THEN ? ELSE branch_id END,
             department_id = COALESCE(department_id, ?),
             employee_code = CASE WHEN employee_code = '' THEN ? ELSE employee_code END
         WHERE id = ?
            `,
        [
          keycloakId,
          keycloakUser.id,
          keycloakUser.username,
          profile.role,
          profile.branchId,
          profile.departmentId,
          profile.employeeCode,
          byEmail[0].id,
        ],
      );
      this.log.info(
        {
          id: byEmail[0].id,
        },
        `Existing user ${byEmail[0].id} synced with Authentik`,
      );
      const updated = await this.getUserById(byEmail[0].id);
      return updated!;
    }

    // ── 5. ສ້າງ user ໃໝ່ ─────────────────────────────────────
    const id = randomUUID();
    const defaultBranch = `11111111-0000-0000-0000-000000000001`;

    await this.db.query(
      `INSERT INTO users
         (id, authentik_id, authentik_pk, employee_code,
          full_name, email, role, branch_id, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        keycloakId,
        keycloakUser.id,
        profile.employeeCode || keycloakUser.username,
        keycloakUser.username,
        keycloakUser.email,
        profile.role,
        profile.branchId || defaultBranch,
        profile.departmentId,
      ],
    );

    this.log.info(
      {
        id,
        email: keycloakUser.email,
        role: profile.role,
        branch: profile.branchId,
      },
      "New user created",
    );

    const user = await this.getUserById(id);
    return user!;
  }

  // ── Sync profile: refresh ຈາກ Authentik ─────────────────
  // ເອີ້ນ manual ຫຼື scheduled ເພື່ອ sync role/branch ໃໝ່
  async syncFromAuth(userId: string): Promise<BankUser> {
    const user = await this.getUserById(userId);
    if (!user) throw { statusCode: 404, message: "User not found" };
    if (!user.keycloak_id)
      throw { statusCode: 400, message: "User has no Keycloak ID" };

    const keycloakUser = await keycloakClient.getUserById(user.keycloak_id);
    if (!keycloakUser)
      throw { statusCode: 404, message: "User not found in Keycloak" };

    const profile = mapKcUser(keycloakUser);
    await this.db.query(
      `UPDATE users
          SET full_name   = ?,
            email         = ?,
            role          = ?,
            branch_id     = ?,
            department_id = ?,
            employee_code = ?
          WHERE id = ?
            `,
      [
        keycloakUser.username,
        keycloakUser.email,
        profile.role,
        profile.branchId || user.branch_id,
        profile.departmentId || user.department_id,
        profile.employeeCode || user.employee_code,
        userId,
      ],
    );
    this.log.info(
      {
        userId,
        role: profile.role,
      },
      `User ${userId} synced with Authentik`,
    );
    return (await this.getUserById(userId))!;
  }

  // ── updateLastLogin ───────────────────────────────────────
  async updateLastLogin(userId: string): Promise<void> {
    await this.db.query(`UPDATE users SET last_login = now(3) WHERE id = ?`, [
      userId,
    ]);
  }

  // ── Provision (auto-create ເມື່ອ first login) ─────────────
  async provisionUser(
    keycloakId: string,
    fullName: string,
    email: string,
    employeeCode: string,
  ): Promise<BankUser> {
    // check by keycloak_id first
    let user = await this.getUserByKeycloakId(keycloakId);
    if (user) return user;

    //check by email
    const byEmail = await this.db.query(`Select *from users where email = ?`, [
      email,
    ]);
    if (byEmail[0]) {
      await this.db.query(``, [keycloakId, byEmail[0].id]);
      return { ...byEmail[0], keycloak_id: keycloakId };
    }

    // ສ້າງ user ໃໝ່ ດ້ວຍ default role = 'maker'
    // Admin ຕ້ອງ assign role + branch ຈາກ admin panel

    const id = randomUUID();
    const defaultBranchId = `11111111-0000-0000-0000-000000000001`;

    await this.db.execute(
      `INSERT INTO users (id, authentik_id, employee_code, full_name, email, role, branch_id, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `,
      [
        id,
        keycloakId,
        employeeCode,
        fullName,
        email,
        "maker",
        defaultBranchId,
        true,
      ],
    );

    user = await this.getUserById(id);
    if (!user) {
      throw {
        statusCode: 500,
        message: "Failed to provision user",
      };
    }
    this.log.info({ id, email }, "Provisioned user");
    return user;
  }
}
