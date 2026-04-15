import {} from "@vpndoc/shared-types";
import { type FastifyInstance } from "fastify";
export interface AuthentikGroup {
  pk: string;
  num_pk: number;
  name: string;
  attributes: Record<string, unknown>;
}

export interface AuthentikUser {
  pk: number;
  uuid: string;
  username: string;
  name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  groups_obj: AuthentikGroup[];
  attributes: Record<string, unknown>;
}

interface AuthentikListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface CreateUserPayload {
  username: string;
  name: string;
  email: string;
  password: string;
  attributes: Record<string, unknown>;
}

class AuthentikClient {
  private baseUrl: string;
  private apiToken: string;
  // private app: FastifyInstance;
  constructor() {
    // this.app = {} as FastifyInstance;
    this.baseUrl = process.env.AUTHENTIK_URL as string;
    this.apiToken = process.env.AUTHENTIK_API_TOKEN as string;
  }

  private timeout() {
    return AbortSignal.timeout(5_000);
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  async getUserByUuId(uuid: string): Promise<AuthentikUser | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v3/core/users/${uuid}`, {
        headers: this.headers,
        signal: AbortSignal.timeout(5_000),
        method: "POST",
      });

      if (res.status === 404) return null;
      if (!res.ok)
        throw new Error(`Failed to fetch user from Authentik : ${res.status}`);
      return res.json() as Promise<AuthentikUser>;
    } catch (error) {
      console.error("[AuthentikClient] getUserById error: ", error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<AuthentikUser | null> {
    try {
      const url = new URL(`${this.baseUrl}/api/v3/core/users/`);
      url.searchParams.set("search", email);
      url.searchParams.set("include_groups", "true");

      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) throw new Error(`Authentik API : ${res.status}`);

      const body = (await res.json()) as AuthentikListResponse<AuthentikUser>;
      return (
        body.results.find((user: AuthentikUser) => user.email === email) ?? null
      );
    } catch (error) {
      console.error("[AuthentikClient] getUserByEmail error: ", error);
      return null;
    }
  }

  //get user by groups
  async getUserByGroups(userPk: number): Promise<AuthentikGroup[]> {
    try {
      const url = new URL(`${this.baseUrl}/api/v3/core/groups/`);
      url.searchParams.set("member_by_pk", String(userPk));
      url.searchParams.set("include_users", "false");

      const res = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(5_000),
      });

      if (!res.ok) throw new Error(`Authentik API : ${res.status}`);

      const body = (await res.json()) as AuthentikListResponse<AuthentikGroup>;
      return body.results;
    } catch (error) {
      console.error("[AuthentikClient] getUserByGroups error: ", error);
      return [];
    }
  }

  //get user info groups
  async getFullUser(uuid: string): Promise<AuthentikUser | null> {
    const user = await this.getUserByUuId(uuid);
    if (!user) return null;

    if (!user.groups_obj || user.groups_obj.length === 0) {
      user.groups_obj = await this.getUserByGroups(user.pk);
    }

    return user;
  }

  // ── PATCH /api/v3/core/users/{uuid}/ ─────────────────
  // ອັບເດດ attributes ຂອງ user ໃນ Authentik
  async updateUserAttributes(
    uuid: string,
    attributes: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v3/core/users/${uuid}`, {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify({ attributes }),
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch (error) {
      console.error("[AuthentikClient] updateUserAttributes error: ", error);
      return false;
    }
  }

  async createUser(payload: CreateUserPayload): Promise<AuthentikUser> {
    const body: Record<string, unknown> = {
      username: payload.username,
      name: payload.name,
      email: payload.email,
      is_active: true,
      // password: payload.password,
      attributes: payload.attributes,
      path: "users",
    };

    const res = await fetch(`${this.baseUrl}/api/v3/core/users/}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      signal: this.timeout(),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Authentik create user failed (${res.status}) : ${err}`);
    }

    const created = (await res.json()) as AuthentikUser;

    if (payload.password) {
      await this.setPassword(created.pk, payload.password);
    }

    return created;
  }

  async setPassword(userPk: number, password: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/v3/core/users/${userPk}/set_password/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          password,
        }),
        signal: this.timeout(),
      },
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Authentik set password failed (${res.status}) : ${err}`);
    }
  }

  async getGroupByName(name: string): Promise<AuthentikGroup | null> {
    const url = new URL(`${this.baseUrl}/api/v3/core/groups/`);
    url.searchParams.set("name", name);
    const res = await fetch(url, {
      headers: this.headers,
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AuthentikListResponse<AuthentikGroup>;
    return body.results[0] ?? null;
  }

  async addUserToGroup(userPk: number, groupName: string): Promise<boolean> {
    const group = await this.getGroupByName(groupName);
    if (!group) {
      console.error("[AuthentikClient] group not found");
      return false;
    }
    const res = await fetch(
      `${this.baseUrl}/api/v3/core/users/groups/${group.pk}/add_user/`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ pk: userPk }),
        signal: AbortSignal.timeout(5_000),
      },
    );
    return res.ok;
  }
}

const authentikClient = new AuthentikClient();
export { authentikClient };
