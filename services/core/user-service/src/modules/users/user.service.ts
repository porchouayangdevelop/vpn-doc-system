import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

import type { FastifyInstance } from "fastify";
import { User, UpdateUser, ListUsers } from "./user.schema";
import { authentikClient } from "@/lib/authentik-client";
import { mapAuthentikToBankProfile } from "@/lib/authentik-mapper";
import { UserRepo } from "./user.repo";

export interface BankUser {
  id: string;
  authentik_id: string;
  authentik_pk: number | null;
  employee_code: string;
  full_name: string;
  email: string;
  role: string;
  branch_id: string;
  department_id?: string | null;
  is_active: boolean;
  last_login_at: string | null;
  password_hash?: string;
  created_at: Date;
  updated_at: Date;
}
export interface BankUsersList {
  items: Array<BankUser>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

class UserService {
  constructor({userRepo}: {userRepo: UserRepo}) {
  
  }

  // ── Create user + Authentik account (admin) ───────────────
  // Admin ສ້າງ user ໂດຍ:
  //   1. ສ້າງ account ໃນ Authentik API
  //   2. Assign ໄປ group ຕາມ role
  //   3. ສ້າງ bank profile ໃນ DB
  async createUserWithAuthentik(dto: User): Promise<BankUser> {
    const exists = await this.app.db.query<BankUser[]>(
      `SELECT id FROM users WHERE employee_code = $1 or email = $2`,
      [dto.employee_code, dto.email],
    );
    if (exists.length > 0) {
      throw {
        statusCode: 409,
        message: "User with the same employee code or email already exists",
      };
    }
    const authentikUser = await authentikClient.createUser({
      username: dto.employee_code,
      name: dto.full_name,
      email: dto.email,
      password: dto.password,
      attributes: {
        employee_code: dto.employee_code,
        branch_id: dto.branch_id,
        department_id: dto.department_id ?? null,
        role: dto.role,
      },
    });



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
      const assigned = await authentikClient.addUserToGroup(
        authentikUser.pk,
        groupName,
      );

      if (!assigned) {
        throw {
          statusCode: 500,
          message: "Failed to assign user to group in Authentik",
        };
      }
    }

    const id = randomUUID();
    await this.app.db.query(
      `INSERT INTO users (id, authentik_id, authentik_pk, employee_code, full_name, email, role, branch_id, department_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        authentikUser.uuid,
        authentikUser.pk,
        dto.employee_code,
        dto.full_name,
        dto.email,
        dto.role,
        dto.branch_id,
        dto.department_id ?? null,
        true,
      ],
    );
    this.app.log.info({ id }, "User created in both Authentik and DB");

    return (await this.getUserById(id))!;
  }

  async createUser(dto: User): Promise<BankUser> {
    const exists = await this.app.db.query<BankUser[]>(
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

    await this.app.db.query(
      `INSERT INTO users (id, authentik_id, employee_code, full_name, email, role, branch_id, department_id, is_active, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  async getUserById(id: string): Promise<BankUser | null> {
    const rows = await this.app.db.query(
      `SELECT 
      id, authentik_id, employee_code, full_name, email, role, branch_id, department_id, is_active, last_login_at, created_at, updated_at   
      FROM users WHERE id = ?`,
      [id],
    );

    return rows[0] ?? null;
  }

  async getUserByAuthentikId(authentikId: string): Promise<BankUser | null> {
    const rows = await this.app.db.query(
      `SELECT 
      id, authentik_id, employee_code, full_name, email, role, branch_id, department_id, is_active, last_login_at, created_at, updated_at   
      FROM users WHERE authentik_id = ? and is_active = 1`,
      [authentikId],
    );

    return rows[0] ?? null;
  }

  async listUsers(query: ListUsers): Promise<BankUsersList[] | any[]> {
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
      this.app.db.query<BankUser[]>(
        `SELECT 
        id, authentik_id, employee_code, full_name, email, role, branch_id, department_id, is_active, last_login_at, created_at, updated_at
        FROM users WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, query.limit, offset],
      ),
      this.app.db.query<[{ total: bigint }]>(
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
    await this.app.db.query(
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
    await this.app.db.query(`UPDATE users SET is_active = 0 WHERE id = ?`, [
      id,
    ]);
    return true;
  }

  // ── Provision: sync ຈາກ Authentik ────────────────────────
  // ເອີ້ນໂດຍ Gateway ທຸກ request ທີ່ user ∅ ຢູ່ໃນ cache
  async provisionUserByAuthentikId(authentikId: string): Promise<BankUser> {
    // check by authentik_id from db
    const exists = await this.getUserByAuthentikId(authentikId);
    if (exists) {
      this.app.log.info({ authentikId }, "User already exists");
      return exists;
    }

    //check authentik api
    this.app.log.info({ authentikId }, "Fetching user from authentik api...");
    const authentikUser = await authentikClient.getFullUser(authentikId);
    if (!authentikUser) {
      throw {
        statusCode: 404,
        message: `User ${authentikId} not found in Authentik`,
      };
    }

    this.app.log.info(
      {
        authentikId,
        email: authentikUser.email,
        groups: authentikUser.groups_obj?.map((g) => g.name),
      },
      "Authenktik user fetched",
    );

    // ── 3. Map Authentik data → bank profile ────────────────
    const profile = mapAuthentikToBankProfile(authentikUser);

    this.app.log.info(
      {
        email: authentikUser.email,
        role: profile.role,
        branch: profile.branchId,
        department: profile.departmentId,
        employeeCode: profile.employeeCode,
      },
      "Authentik user mapped to bank profile",
    );

    // ── 4. ກວດ by email (user ຖືກສ້າງ manual ໄວ້ before) ────
    const byEmail = await this.app.db.query<BankUser[]>(
      `SELECT * FROM users WHERE email = ?`,
      [authentikUser.email],
    );

    if (byEmail[0]) {
      await this.app.db.query(
        `
          UPDATE users SET
            authentik_id  = ?, 
           authentik_pk  = ?,
           full_name     = ?,
           role = case when role ='maker' then ? else role end,
            branch_id     = CASE WHEN branch_id = '' OR branch_id IS NULL THEN ? ELSE branch_id END,
           department_id = COALESCE(department_id, ?),
           employee_code = CASE WHEN employee_code = '' THEN ? ELSE employee_code END
       WHERE id = ?
          `,
        [
          authentikId,
          authentikUser.pk,
          authentikUser.name,
          profile.role,
          profile.branchId,
          profile.departmentId,
          profile.employeeCode,
          byEmail[0].id,
        ],
      );
      this.app.log.info(
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

    await this.app.db.query(
      `INSERT INTO users
       (id, authentik_id, authentik_pk, employee_code,
        full_name, email, role, branch_id, department_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        authentikId,
        authentikUser.pk,
        profile.employeeCode || authentikUser.username,
        authentikUser.name,
        authentikUser.email,
        profile.role,
        profile.branchId || defaultBranch,
        profile.departmentId,
      ],
    );

    this.app.log.info(
      {
        id,
        email: authentikUser.email,
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
  async syncFromAuthentik(userId: string): Promise<BankUser> {
    const user = await this.getUserById(userId);
    if (!user) throw { statusCode: 404, message: "User not found" };
    if (!user.authentik_id)
      throw { statusCode: 400, message: "User has no Authentik ID" };

    const authentikUser = await authentikClient.getFullUser(user.authentik_id);
    if (!authentikUser)
      throw { statusCode: 404, message: "User not found in Authentik" };

    const profile = mapAuthentikToBankProfile(authentikUser);
    await this.app.db.query(
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
        authentikUser.name,
        authentikUser.email,
        profile.role,
        profile.branchId || user.branch_id,
        profile.departmentId || user.department_id,
        profile.employeeCode || user.employee_code,
        userId,
      ],
    );
    this.app.log.info(
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
    await this.app.db.query(
      `UPDATE users SET last_login = now(3) WHERE id = ?`,
      [userId],
    );
  }

  // ── Provision (auto-create ເມື່ອ first login) ─────────────
  async provisionUser(
    authentikId: string,
    fullName: string,
    email: string,
    employeeCode: string,
  ): Promise<BankUser> {
    // check by authentik_id first
    let user = await this.getUserByAuthentikId(authentikId);
    if (user) return user;

    //check by email
    const byEmail = await this.app.db.query(
      `Select *from users where email = ?`,
      [email],
    );
    if (byEmail[0]) {
      await this.app.db.query(``, [authentikId, byEmail[0].id]);
      return { ...byEmail[0], authentik_id: authentikId };
    }

    // ສ້າງ user ໃໝ່ ດ້ວຍ default role = 'maker'
    // Admin ຕ້ອງ assign role + branch ຈາກ admin panel

    const id = randomUUID();
    const defaultBranchId = `11111111-0000-0000-0000-000000000001`;

    await this.app.db.execute(
      `INSERT INTO users (id, authentik_id, employee_code, full_name, email, role, branch_id, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)  `,
      [
        id,
        authentikId,
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
    this.app.log.info({ id, email }, "Provisioned user");
    return user;
  }
}

export default UserService;
