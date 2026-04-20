import { Department } from "./dep.schema";
import { Db } from "@/plugins/db";

export class DepartmentRepo {
  constructor(private deps: { db: Db }) {}

  /**
   * Retrieve the database instance.
   * @returns {Db} The database instance.
   */
  private get db() {
    return this.deps.db;
  }

  /**
   * Retrieve all active departments.
   * @returns {Promise<Department[] | null>} A promise that resolves to an array of departments or null if an error occurs.
   */
  async findAll(): Promise<Department[] | null> {
    try {
      return await this.db.query<Department[]>(
        `SELECT * FROM departments where is_active = 1  ORDER BY code`,
      );
    } catch (error: any | unknown) {
      throw error.message;
    }
  }

  async findById(id: string): Promise<Department | null> {
    try {
      const rows = await this.db.query<Department[]>(
        `SELECT * FROM departments WHERE branch_id = ? AND is_active = 1 ORDER BY code`,
        [id],
      );

      return rows[0] ?? null;
    } catch (error: any | unknown) {
      throw error.message;
    }
  }
  dispose() {
    this.db.pool.end();
  }
}
