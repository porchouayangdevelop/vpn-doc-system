import kcAdminClient from "@keycloak/keycloak-admin-client";
import { Type, type Static } from "@sinclair/typebox";

export const KcUser = Type.Object({
  id: Type.String(),
  username: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
  email: Type.String(),
  enabled: Type.Boolean(),
  emailVerified: Type.Boolean(),
  attributes: Type.Optional(
    Type.Record(Type.String(), Type.Array(Type.String())),
  ),
  realmRoles: Type.Optional(Type.Array(Type.String())),
});

export const KcCreateUser = Type.Object({
  username: Type.String({
    minLength: 3,
    maxLength: 30,
    // pattern: "^[a-zA-Z0-9._-]+$",
  }),
  firstName: Type.String(),
  lastName: Type.String(),
  email: Type.String({
    format: "email",
  }),
  password: Type.String({
    minLength: 8,
    maxLength: 128,
    pattern:
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    format: "regex",
    description:
      "Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters.",
  }),
  enabled: Type.Boolean(),
  emailVerified: Type.Boolean(),
  attributes: Type.Optional(
    Type.Record(Type.String(), Type.Array(Type.String())),
  ),
  realmRoles: Type.Optional(Type.Array(Type.String())),
  employeeCode: Type.Optional(Type.String()),
  branchId: Type.Optional(Type.String()),
  departmentId: Type.Optional(Type.String()),
  role: Type.Union([
    Type.Literal("maker"),
    Type.Literal("unit_head"),
    Type.Literal("branch"),
    Type.Literal("department"),
    Type.Literal("it_head"),
    Type.Literal("it_po"),
    Type.Literal("it_staff"),
    Type.Literal("admin"),
  ]),
});

export type KcUser = Static<typeof KcUser>;
export type KcCreateUser = Static<typeof KcCreateUser>;

class KeycloakClient {
  private kc: kcAdminClient;
  private realm: string | undefined;
  private initialized: boolean = false;

  constructor() {
    this.realm = process.env.KEYCLOAK_REALM;
    this.kc = new kcAdminClient({
      baseUrl: process.env.KEYCLOAK_BASE_URL!,
      realmName: this.realm!,
    });
  }

  private async auth() {
    await this.kc.auth({
      grantType: "client_credentials",
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
    });
    this.kc.setConfig({ realmName: this.realm! });
  }

  async getUserById(id: string): Promise<KcUser | null> {
    await this.auth();
    try {
      const user = await this.kc.users.findOne({ id, realm: this.realm! });
      if (!user?.id) return null;

      const roleMappings = await this.kc.users.listRealmRoleMappings({
        id,
        realm: this.realm!,
      });

      return {
        id: user.id,
        username: user.username!,
        firstName: user.firstName!,
        lastName: user.lastName!,
        email: user.email!,
        enabled: user.enabled!,
        emailVerified: user.emailVerified!,
        attributes: user.attributes ?? ({} as Record<string, string[]>),
        realmRoles: roleMappings.map((r) => r.name as string).filter(Boolean),
      };
    } catch (error) {
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<KcUser | null> {
    await this.auth();
    const users = await this.kc.users.find({ email, realm: this.realm! });
    if (!users[0]?.id) return null;
    return this.getUserById(users[0]?.id);
  }

  async createUser(user: KcCreateUser): Promise<KcUser> {
    await this.auth();

    const created = await this.kc.users.create({
      realm: this.realm!,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      enabled: user.enabled,
      attributes: {
        employeeCode: [user.employeeCode],
        branchId: [user.branchId],
        ...(user.departmentId ? { department_id: [user.departmentId] } : {}),
      },
      credentials: [
        {
          type: "password",
          value: user.password,
          temporary: false,
        },
      ],
    });

    //assign realm roles
    const role = await this.kc.roles.findOneByName({
      name: user.role!,
      realm: this.realm!,
    });
    if (role?.id) {
      await this.kc.users.addRealmRoleMappings({
        id: created.id,
        realm: this.realm!,
        roles: [{ id: role.id, name: role.name! }],
      });
    }

    const isUser = await this.getUserById(created.id);
    if (!isUser) {
      throw new Error("Failed to retrieve created user");
    }
    return isUser;
  }

  async updateUserAttributes(
    id: string,
    attributes: Record<string, string>,
  ): Promise<void> {
    await this.auth();

    const current = await this.kc.users.findOne({ id, realm: this.realm! });
    const merged = {
      ...(current?.attributes ?? {}),
      ...Object.fromEntries(
        Object.entries(attributes).map(([key, value]) => [key, [value]]),
      ),
    };

    await this.kc.users.update(
      { id, realm: this.realm! },
      { attributes: merged },
    );
  }

  //change realm roles
  async assignRealmRoles(userId: string, rolemName: string): Promise<void> {
    await this.auth();

    const role = await this.kc.roles.findOneByName({
      name: rolemName!,
      realm: this.realm!,
    });
    if (!role?.id || !role?.name) {
      throw new Error("Role not found");
    }

    // delete old roles
    const currentRoles = await this.kc.users.listRealmRoleMappings({
      id: userId,
      realm: this.realm!,
    });
    if (currentRoles.length > 0) {
      await this.kc.users.delRealmRoleMappings({
        id: userId,
        realm: this.realm!,
        roles: currentRoles.map((r) => ({
          id: r.id!,
          name: r.name!,
        })) as Array<{ id: string; name: string }>,
      });
    }

    // assign new role
    await this.kc.users.addRealmRoleMappings({
      id: userId,
      realm: this.realm!,
      roles: [{ id: role.id, name: role.name! }],
    });
  }
}

export const keycloakClient = new KeycloakClient();
